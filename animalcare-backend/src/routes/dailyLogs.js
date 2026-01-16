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

    // Optional: ensure task exists and is active
    const task = await prisma.task.findUnique({ where: { id: tId } });
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (!task.active) return res.status(400).json({ error: "Task is inactive" });

    const q =
      quantityGrams === undefined || quantityGrams === null
        ? null
        : Number(quantityGrams);

    if (q !== null && (!Number.isFinite(q) || q < 0)) {
      return res.status(400).json({ error: "quantityGrams must be a non-negative number" });
    }

    const log = await prisma.dailyLog.upsert({
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
        quantityGrams: q === null ? null : Math.round(q),
        notes: notes ? String(notes) : null,
      },
      update: {
        completed: completed === undefined ? true : Boolean(completed),
        quantityGrams: q === null ? null : Math.round(q),
        notes: notes ? String(notes) : null,
      },
      include: {
        task: { select: { id: true, name: true, category: true } },
      },
    });

    res.status(201).json(log);
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

    const existing = await prisma.dailyLog.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Log not found" });

    const isAdmin = req.user.role === "ADMIN";
    if (!isAdmin && existing.userId !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { completed, quantityGrams, notes } = req.body;

    const q =
      quantityGrams === undefined || quantityGrams === null
        ? undefined
        : Number(quantityGrams);

    if (q !== undefined && (!Number.isFinite(q) || q < 0)) {
      return res.status(400).json({ error: "quantityGrams must be a non-negative number" });
    }

    const log = await prisma.dailyLog.update({
      where: { id },
      data: {
        ...(completed !== undefined ? { completed: Boolean(completed) } : {}),
        ...(q !== undefined ? { quantityGrams: Math.round(q) } : {}),
        ...(notes !== undefined ? { notes: notes ? String(notes) : null } : {}),
      },
    });

    res.json(log);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;