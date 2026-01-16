const express = require("express");
const prisma = require("../prisma");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

function isValidISODateOnly(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toDateOnlyUTC(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

// GET /tasks/today?date=YYYY-MM-DD
router.get("/today", requireAuth, async (req, res) => {
  try {
    const date = req.query.date;

    if (!isValidISODateOnly(date)) {
      return res.status(400).json({ error: "date query param required: YYYY-MM-DD" });
    }

    const day = toDateOnlyUTC(date);

    const tasks = await prisma.task.findMany({
      where: { active: true, isDaily: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });

    const myLogs = await prisma.dailyLog.findMany({
      where: { date: day, userId: req.user.userId },
      select: { id: true, taskId: true, completed: true, quantityGrams: true, notes: true },
    });

    const byTaskId = new Map(myLogs.map((l) => [l.taskId, l]));

    const result = tasks.map((t) => {
      const log = byTaskId.get(t.id) || null;
      return {
        taskId: t.id,
        taskName: t.name,
        category: t.category,
        logged: Boolean(log),
        completed: log ? log.completed : false,
        quantityGrams: log ? log.quantityGrams : null,
        notes: log ? log.notes : null,
        logId: log ? log.id : null,
      };
    });

    res.json({ date, tasks: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;