const express = require("express");
const prisma = require("../prisma");
const requireAuth = require("../middleware/requireAuth");
const { createRestockEventForUser } = require("../lib/googleCalendar");

const router = express.Router();

function toDateOnlyUTC(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

function isValidISODateOnly(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry || "").trim()).filter(Boolean);
}

function filterAllowedSubtasks(taskSubtasks, completedSubtasks) {
  const allowed = new Set(normalizeStringArray(Array.isArray(taskSubtasks) ? taskSubtasks : []));
  return normalizeStringArray(completedSubtasks).filter((entry) => allowed.has(entry));
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const { date } = req.query;

    if (!isValidISODateOnly(date)) {
      return res.status(400).json({ error: "date query param required: YYYY-MM-DD" });
    }

    const day = toDateOnlyUTC(date);
    const isAdmin = req.user.role === "ADMIN";

    const logs = await prisma.dailyLog.findMany({
      where: {
        date: day,
        ...(isAdmin ? {} : { userId: req.user.userId }),
      },
      include: {
        task: {
          select: {
            id: true,
            name: true,
            category: true,
            animalCategory: true,
            subtasks: true,
            photoRequired: true,
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ taskId: "asc" }, { id: "asc" }],
    });

    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { date, taskId, completed, quantityGrams, notes, completedSubtasks, photoUrl } = req.body || {};

    if (!isValidISODateOnly(date)) {
      return res.status(400).json({ error: "date is required: YYYY-MM-DD" });
    }
    const day = toDateOnlyUTC(date);

    const tId = Number(taskId);
    if (!Number.isInteger(tId)) {
      return res.status(400).json({ error: "taskId must be an integer" });
    }

    const task = await prisma.task.findUnique({ where: { id: tId } });
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (!task.active) return res.status(400).json({ error: "Task is inactive" });

    const normalizedCompletedSubtasks = filterAllowedSubtasks(task.subtasks, completedSubtasks);
    if (task.photoRequired && !photoUrl) {
      return res.status(400).json({ error: "A photo is required for this task" });
    }

    const q = quantityGrams === undefined || quantityGrams === null ? null : Number(quantityGrams);
    if (q !== null && (!Number.isFinite(q) || q < 0)) {
      return res.status(400).json({ error: "quantityGrams must be a non-negative number" });
    }

    const newQty = q === null ? 0 : Math.round(q);

    const result = await prisma.$transaction(async (tx) => {
      const approvalStatus = req.user.role === "ADMIN" ? "APPROVED" : "PENDING";

      const log = await tx.dailyLog.upsert({
        where: {
          date_taskId_userId: {
            date: day,
            taskId: tId,
            userId: req.user.userId,
          },
        },
        create: {
          date: day,
          taskId: tId,
          userId: req.user.userId,
          completed: completed === undefined ? true : Boolean(completed),
          quantityGrams: newQty === 0 ? null : newQty,
          notes: notes ? String(notes) : null,
          completedSubtasks: normalizedCompletedSubtasks,
          photoUrl: photoUrl || null,
          approvalStatus,
        },
        update: {
          completed: completed === undefined ? true : Boolean(completed),
          quantityGrams: newQty === 0 ? null : newQty,
          notes: notes ? String(notes) : null,
          completedSubtasks: normalizedCompletedSubtasks,
          photoUrl: photoUrl || undefined,
          approvalStatus,
        },
        include: {
          task: {
            select: {
              id: true,
              name: true,
              category: true,
              animalCategory: true,
              affectsInventory: true,
              feedItemId: true,
            },
          },
        },
      });

      let inventory = null;

      if (log.task.affectsInventory && log.task.feedItemId) {
        const desiredConsumed = newQty;
        const desiredDelta = -desiredConsumed;

        const existingMove = await tx.inventoryMovement.findUnique({
          where: { refType_refId: { refType: "DailyLog", refId: log.id } },
        });

        const prevDelta = existingMove ? existingMove.deltaGrams : 0;
        const changeDelta = desiredDelta - prevDelta;

        if (changeDelta !== 0) {
          const movement = await tx.inventoryMovement.upsert({
            where: { refType_refId: { refType: "DailyLog", refId: log.id } },
            create: {
              feedItemId: log.task.feedItemId,
              date: day,
              deltaGrams: desiredDelta,
              reason: "daily-log",
              refType: "DailyLog",
              refId: log.id,
              userId: req.user.userId,
            },
            update: {
              feedItemId: log.task.feedItemId,
              date: day,
              deltaGrams: desiredDelta,
            },
          });

          const updatedItem = await tx.feedItem.update({
            where: { id: log.task.feedItemId },
            data: { stockGrams: { increment: changeDelta } },
          });

          inventory = { movement, feedItem: updatedItem };
        }
      }

      return { log, inventory };
    });

    try {
      const feedItem = result.inventory?.feedItem;
      const threshold = 5000;
      if (feedItem && feedItem.stockGrams <= threshold) {
        await createRestockEventForUser(req.user.userId, feedItem.name, feedItem.stockGrams, threshold);
      }
    } catch (err) {
      console.error("Calendar event creation failed after daily log:", err.message);
    }

    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error. Check that completedSubtasks and photoUrl exist in Prisma.",
    });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

    const isAdmin = req.user.role === "ADMIN";

    const existing = await prisma.dailyLog.findUnique({
      where: { id },
      include: {
        task: { select: { affectsInventory: true, feedItemId: true, photoRequired: true, subtasks: true } },
      },
    });

    if (!existing) return res.status(404).json({ error: "Log not found" });
    if (!isAdmin && existing.userId !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { completed, quantityGrams, notes, completedSubtasks, photoUrl } = req.body || {};

    const q = quantityGrams === undefined || quantityGrams === null ? undefined : Number(quantityGrams);
    if (q !== undefined && (!Number.isFinite(q) || q < 0)) {
      return res.status(400).json({ error: "quantityGrams must be a non-negative number" });
    }

    const nextPhotoUrl = photoUrl === undefined ? existing.photoUrl : (photoUrl || null);
    if (existing.task.photoRequired && !nextPhotoUrl) {
      return res.status(400).json({ error: "A photo is required for this task" });
    }

    const newQty = q === undefined ? undefined : Math.round(q);
    const safeCompletedSubtasks = completedSubtasks === undefined
      ? undefined
      : filterAllowedSubtasks(existing.task.subtasks, completedSubtasks);

    const result = await prisma.$transaction(async (tx) => {
      const log = await tx.dailyLog.update({
        where: { id },
        data: {
          ...(completed !== undefined ? { completed: Boolean(completed) } : {}),
          ...(newQty !== undefined ? { quantityGrams: newQty === 0 ? null : newQty } : {}),
          ...(notes !== undefined ? { notes: notes ? String(notes) : null } : {}),
          ...(safeCompletedSubtasks !== undefined ? { completedSubtasks: safeCompletedSubtasks } : {}),
          ...(photoUrl !== undefined ? { photoUrl: nextPhotoUrl } : {}),
        },
        include: {
          task: { select: { affectsInventory: true, feedItemId: true } },
        },
      });

      let inventory = null;
      if (newQty === undefined) return { log, inventory };

      if (log.task.affectsInventory && log.task.feedItemId) {
        const desiredConsumed = newQty;
        const desiredDelta = -desiredConsumed;

        const existingMove = await tx.inventoryMovement.findUnique({
          where: { refType_refId: { refType: "DailyLog", refId: log.id } },
        });

        const prevDelta = existingMove ? existingMove.deltaGrams : 0;
        const changeDelta = desiredDelta - prevDelta;

        if (changeDelta !== 0) {
          const movement = await tx.inventoryMovement.upsert({
            where: { refType_refId: { refType: "DailyLog", refId: log.id } },
            create: {
              feedItemId: log.task.feedItemId,
              date: log.date,
              deltaGrams: desiredDelta,
              reason: "daily-log",
              refType: "DailyLog",
              refId: log.id,
              userId: req.user.userId,
            },
            update: {
              feedItemId: log.task.feedItemId,
              date: log.date,
              deltaGrams: desiredDelta,
            },
          });

          const updatedItem = await tx.feedItem.update({
            where: { id: log.task.feedItemId },
            data: { stockGrams: { increment: changeDelta } },
          });

          inventory = { movement, feedItem: updatedItem };
        }
      }

      return { log, inventory };
    });

    try {
      const feedItem = result.inventory?.feedItem;
      const threshold = 5000;
      if (feedItem && feedItem.stockGrams <= threshold) {
        await createRestockEventForUser(req.user.userId, feedItem.name, feedItem.stockGrams, threshold);
      }
    } catch (err) {
      console.error("Calendar event creation failed after daily log edit:", err.message);
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error. Check that completedSubtasks and photoUrl exist in Prisma.",
    });
  }
});

module.exports = router;
