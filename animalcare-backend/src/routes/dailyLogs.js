const express = require("express");
const prisma = require("../prisma");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

/**
 * Helpers
 */
function toDateOnlyUTC(dateStr) {
  // Expecting YYYY-MM-DD
  // Store as UTC midnight to avoid timezone drift in DB comparisons
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

function isValidISODateOnly(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/**
 * GET /daily-logs?date=YYYY-MM-DD
 * - Admin: returns all logs for that date
 * - User: returns only their logs for that date
 */
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
        task: { select: { id: true, name: true, category: true } },
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

/**
 * POST /daily-logs
 * Body: { date: "YYYY-MM-DD", taskId: number, completed?: boolean, quantityGrams?: number, notes?: string }
 * - Any logged-in user can create their own log entry
 * - Uses upsert so repeating the same log updates instead of duplicates
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { date, taskId, completed, quantityGrams, notes } = req.body || {};

    if (!isValidISODateOnly(date)) {
      return res.status(400).json({ error: "date is required: YYYY-MM-DD" });
    }
    const day = toDateOnlyUTC(date);

    const tId = Number(taskId);
    if (!Number.isInteger(tId)) {
      return res.status(400).json({ error: "taskId must be an integer" });
    }

    // Ensure task exists and is active
    const task = await prisma.task.findUnique({ where: { id: tId } });
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (!task.active) return res.status(400).json({ error: "Task is inactive" });

    const q =
      quantityGrams === undefined || quantityGrams === null
        ? null
        : Number(quantityGrams);

    if (q !== null && (!Number.isFinite(q) || q < 0)) {
      return res
        .status(400)
        .json({ error: "quantityGrams must be a non-negative number" });
    }

    const newQty = q === null ? 0 : Math.round(q);

    const result = await prisma.$transaction(async (tx) => {
      // Find existing log so we can compute inventory delta when user edits quantity
      const existing = await tx.dailyLog.findUnique({
        where: {
          date_taskId_userId: {
            date: day,
            taskId: tId,
            userId: req.user.userId,
          },
        },
      });

      const oldQty = existing?.quantityGrams ? existing.quantityGrams : 0;


      // Upsert log
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
          approvalStatus,
        },
        update: {
          completed: completed === undefined ? true : Boolean(completed),
          quantityGrams: newQty === 0 ? null : newQty,
          notes: notes ? String(notes) : null,
          approvalStatus,
        },
        include: {
          task: {
            select: {
              id: true,
              name: true,
              category: true,
              affectsInventory: true,
              feedItemId: true,
            },
          },
        },
      });

      // Inventory adjustment
      // Inventory adjustment (ONE movement per DailyLog)
let inventory = null;

if (log.task.affectsInventory && log.task.feedItemId) {
  // newQty is grams user entered (0 means none)
  const desiredConsumed = newQty;          // grams
  const desiredDelta = -desiredConsumed;   // inventory delta for THIS log

  // existing movement for this log (if any)
  const existingMove = await tx.inventoryMovement.findUnique({
    where: { refType_refId: { refType: "DailyLog", refId: log.id } },
  });

  const prevDelta = existingMove ? existingMove.deltaGrams : 0;
  const changeDelta = desiredDelta - prevDelta; // what we must APPLY to stock

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
      data: { stockGrams: { increment: changeDelta } }, // ✅ race-safe
    });

    inventory = { movement, feedItem: updatedItem };
  }
}


      return { log, inventory };
    });

    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * PATCH /daily-logs/:id
 * - Admin can edit any log
 * - Users can only edit their own log
 */
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

    const isAdmin = req.user.role === "ADMIN";

    const existing = await prisma.dailyLog.findUnique({
      where: { id },
      include: {
        task: { select: { affectsInventory: true, feedItemId: true } },
      },
    });

    if (!existing) return res.status(404).json({ error: "Log not found" });
    if (!isAdmin && existing.userId !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { completed, quantityGrams, notes } = req.body || {};

    const q =
      quantityGrams === undefined || quantityGrams === null
        ? undefined
        : Number(quantityGrams);

    if (q !== undefined && (!Number.isFinite(q) || q < 0)) {
      return res.status(400).json({ error: "quantityGrams must be a non-negative number" });
    }

    const newQty = q === undefined ? undefined : Math.round(q);
    const oldQty = existing.quantityGrams ? existing.quantityGrams : 0;

    const result = await prisma.$transaction(async (tx) => {
      // Update log
      const log = await tx.dailyLog.update({
        where: { id },
        data: {
          ...(completed !== undefined ? { completed: Boolean(completed) } : {}),
          ...(newQty !== undefined ? { quantityGrams: newQty === 0 ? null : newQty } : {}),
          ...(notes !== undefined ? { notes: notes ? String(notes) : null } : {}),
        },
        include: {
          task: { select: { affectsInventory: true, feedItemId: true } },
        },
      });

      let inventory = null;

      // If quantity not provided, don’t touch inventory
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

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


module.exports = router;