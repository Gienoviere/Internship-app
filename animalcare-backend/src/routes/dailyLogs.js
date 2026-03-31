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

function normalizeSubtasks(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (typeof item === "string") {
        const title = item.trim();
        if (!title) return null;
        return {
          id: `sub_${index + 1}`,
          title,
          amount: null,
          unit: "g",
          feedItemId: null,
          affectsInventory: false,
          required: true,
          sortOrder: index,
        };
      }
      if (!item || typeof item !== "object") return null;

      const title = String(item.title || "").trim();
      if (!title) return null;

      return {
        id: String(item.id || `sub_${index + 1}`),
        title,
        amount:
          item.amount === null || item.amount === undefined || item.amount === ""
            ? null
            : Number(item.amount),
        unit: String(item.unit || "g").trim() || "g",
        feedItemId:
          item.feedItemId === null ||
          item.feedItemId === undefined ||
          item.feedItemId === ""
            ? null
            : Number(item.feedItemId),
        affectsInventory: Boolean(item.affectsInventory),
        required: item.required === undefined ? true : Boolean(item.required),
        sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function normalizeCompletedSubtasks(taskSubtasks, completedSubtasks) {
  const allowedIds = new Set(normalizeSubtasks(taskSubtasks).map((s) => String(s.id)));
  if (!Array.isArray(completedSubtasks)) return [];
  return completedSubtasks
    .map((entry) => String(entry || "").trim())
    .filter((entry) => allowedIds.has(entry));
}

function unitToGrams(amount, unit) {
  if (amount === null || amount === undefined || amount === "") return 0;
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) return 0;

  const u = String(unit || "g").toLowerCase();
  if (u === "kg") return Math.round(n * 1000);
  if (u === "g" || u === "gram" || u === "grams") return Math.round(n);

  return 0;
}

function buildMovementPlan(task, completedSubtasks, fallbackQuantityGrams) {
  const plan = [];
  const subtasks = normalizeSubtasks(task.subtasks);
  const completedIds = new Set(normalizeCompletedSubtasks(subtasks, completedSubtasks));

  for (const sub of subtasks) {
    if (!completedIds.has(String(sub.id))) continue;
    if (!sub.affectsInventory || !sub.feedItemId) continue;

    const grams = unitToGrams(sub.amount, sub.unit);
    if (grams <= 0) continue;

    plan.push({
      lineKey: `subtask:${sub.id}`,
      feedItemId: Number(sub.feedItemId),
      deltaGrams: -grams,
      reason: "daily-log-subtask",
    });
  }

  if (
    plan.length === 0 &&
    task.affectsInventory &&
    task.feedItemId &&
    fallbackQuantityGrams !== null &&
    fallbackQuantityGrams !== undefined
  ) {
    const q = Number(fallbackQuantityGrams);
    if (Number.isFinite(q) && q > 0) {
      plan.push({
        lineKey: "__task__",
        feedItemId: Number(task.feedItemId),
        deltaGrams: -Math.round(q),
        reason: "daily-log",
      });
    }
  }

  return plan;
}

async function syncInventoryMovements(tx, { logId, date, userId, movementPlan }) {
  const existing = await tx.inventoryMovement.findMany({
    where: { refType: "DailyLog", refId: logId },
  });

  const existingByKey = new Map(existing.map((m) => [String(m.lineKey || "__task__"), m]));
  const nextKeys = new Set(movementPlan.map((m) => String(m.lineKey)));

  const touchedFeedItems = new Set();

  for (const desired of movementPlan) {
    const key = String(desired.lineKey);
    const prev = existingByKey.get(key);
    const prevDelta = prev ? prev.deltaGrams : 0;
    const changeDelta = desired.deltaGrams - prevDelta;

    if (prev) {
      await tx.inventoryMovement.update({
        where: { id: prev.id },
        data: {
          feedItemId: desired.feedItemId,
          date,
          deltaGrams: desired.deltaGrams,
          reason: desired.reason,
          userId,
        },
      });
    } else {
      await tx.inventoryMovement.create({
        data: {
          feedItemId: desired.feedItemId,
          date,
          deltaGrams: desired.deltaGrams,
          reason: desired.reason,
          refType: "DailyLog",
          refId: logId,
          lineKey: key,
          userId,
        },
      });
    }

    if (changeDelta !== 0) {
      await tx.feedItem.update({
        where: { id: desired.feedItemId },
        data: { stockGrams: { increment: changeDelta } },
      });
    }

    touchedFeedItems.add(desired.feedItemId);
  }

  for (const prev of existing) {
    const key = String(prev.lineKey || "__task__");
    if (nextKeys.has(key)) continue;

    await tx.feedItem.update({
      where: { id: prev.feedItemId },
      data: { stockGrams: { increment: -prev.deltaGrams } },
    });

    await tx.inventoryMovement.delete({ where: { id: prev.id } });
    touchedFeedItems.add(prev.feedItemId);
  }

  if (!touchedFeedItems.size) return [];
  return tx.feedItem.findMany({
    where: { id: { in: [...touchedFeedItems] } },
  });
}

async function createAutoObservationForFailedTask(tx, { log, task, userId }) {
  const taskSubtasks = normalizeSubtasks(task.subtasks);
  const completedIds = Array.isArray(log.completedSubtasks) ? log.completedSubtasks.map(String) : [];
  const requiredSubtasks = taskSubtasks.filter((s) => s.required !== false);
  const completedRequiredCount = requiredSubtasks.filter((s) => completedIds.includes(String(s.id))).length;

  const failedWholeTask = log.completed === false;
  const incompleteRequiredSubtasks =
    requiredSubtasks.length > 0 && completedRequiredCount < requiredSubtasks.length;

  const shouldCreate = failedWholeTask || incompleteRequiredSubtasks;
  if (!shouldCreate) return;

  const existing = await tx.observation.findFirst({
    where: {
      date: log.date,
      taskId: task.id,
      createdById: userId,
      title: { contains: task.name },
      status: "OPEN",
    },
  });

  if (existing) return;

  await tx.observation.create({
    data: {
      date: log.date,
      title: `Task issue: ${task.name}`,
      description: failedWholeTask
        ? `This task was marked as incomplete or failed during logging.`
        : `Not all required subcomponents were completed for this task.`,
      severity: "WARN",
      animalTag: task.animalCategory || task.category || null,
      taskId: task.id,
      status: "OPEN",
      createdById: userId,
    },
  });
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

    const normalizedCompletedSubtasks = normalizeCompletedSubtasks(task.subtasks, completedSubtasks);

    const taskSubtasks = normalizeTaskSubtasks(task.subtasks);
    const completedIds = new Set(normalizedCompletedSubtasks.map(String));
    const requiresPhoto = taskSubtasks.some(
      (sub) => sub.photoRequired && completedIds.has(String(sub.id))
    );

    if (requiresPhoto && !photoUrl) {
      return res.status(400).json({ error: "A photo is required for one or more completed subcomponents" });
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
              subtasks: true,
            },
          },
        },
      });

      const movementPlan = buildMovementPlan(
        log.task,
        normalizedCompletedSubtasks,
        newQty
      );

      const touchedFeedItems = await syncInventoryMovements(tx, {
        logId: log.id,
        date: day,
        userId: req.user.userId,
        movementPlan,
      });

      await createAutoObservationForFailedTask(tx, {
        log,
        task: log.task,
        userId: req.user.userId,
      });

      return { log, inventoryFeedItems: touchedFeedItems };
    });

    try {
      const threshold = 5000;
      for (const feedItem of result.inventoryFeedItems || []) {
        if (feedItem.stockGrams <= threshold) {
          await createRestockEventForUser(
            req.user.userId,
            feedItem.name,
            feedItem.stockGrams,
            threshold
          );
        }
      }
    } catch (err) {
      console.error("Calendar event creation failed after daily log:", err.message);
    }

    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error. Check Prisma fields and inventory movement lineKey migration.",
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
        task: {
          select: {
            affectsInventory: true,
            feedItemId: true,
            photoRequired: true,
            subtasks: true,
          },
        },
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

    const existingTaskSubtasks = normalizeTaskSubtasks(existing.task.subtasks);
    const nextCompletedIds = new Set(
      (completedSubtasks === undefined
        ? Array.isArray(existing.completedSubtasks) ? existing.completedSubtasks : []
        : normalizeCompletedSubtasks(existing.task.subtasks, completedSubtasks)
      ).map(String)
    );

    const requiresPhoto = existingTaskSubtasks.some(
      (sub) => sub.photoRequired && nextCompletedIds.has(String(sub.id))
    );

    if (requiresPhoto && !nextPhotoUrl) {
      return res.status(400).json({ error: "A photo is required for one or more completed subcomponents" });
    }

    const newQty = q === undefined ? undefined : Math.round(q);
    const safeCompletedSubtasks =
      completedSubtasks === undefined
        ? Array.isArray(existing.completedSubtasks) ? existing.completedSubtasks : []
        : normalizeCompletedSubtasks(existing.task.subtasks, completedSubtasks);

        const result = await prisma.$transaction(async (tx) => {
      const log = await tx.dailyLog.update({
        where: { id },
        data: {
          ...(completed !== undefined ? { completed: Boolean(completed) } : {}),
          ...(newQty !== undefined ? { quantityGrams: newQty === 0 ? null : newQty } : {}),
          ...(notes !== undefined ? { notes: notes ? String(notes) : null } : {}),
          ...(completedSubtasks !== undefined ? { completedSubtasks: safeCompletedSubtasks } : {}),
          ...(photoUrl !== undefined ? { photoUrl: nextPhotoUrl } : {}),
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
              subtasks: true,
            },
          },
        },
      });

      const effectiveQty = newQty === undefined ? log.quantityGrams : newQty;

      const movementPlan = buildMovementPlan(
        log.task,
        safeCompletedSubtasks,
        effectiveQty
      );

      const touchedFeedItems = await syncInventoryMovements(tx, {
        logId: log.id,
        date: log.date,
        userId: req.user.userId,
        movementPlan,
      });

      await createAutoObservationForFailedTask(tx, {
        log,
        task: log.task,
        userId: req.user.userId,
      });

      return { log, inventoryFeedItems: touchedFeedItems };
    });

    try {
      const threshold = 5000;
      for (const feedItem of result.inventoryFeedItems || []) {
        if (feedItem.stockGrams <= threshold) {
          await createRestockEventForUser(
            req.user.userId,
            feedItem.name,
            feedItem.stockGrams,
            threshold
          );
        }
      }
    } catch (err) {
      console.error("Calendar event creation failed after daily log edit:", err.message);
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error. Check Prisma fields and inventory movement lineKey migration.",
    });
  }
});

module.exports = router;