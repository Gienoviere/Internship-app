const express = require("express");
const prisma = require("../prisma");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

function isValidISODateOnly(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toDateOnlyUTC(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

/**
 * GET /admin/daily-overview?date=YYYY-MM-DD
 * Admin-only: overview of all daily tasks + who logged them on that date
 */
router.get("/daily-overview", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const { date } = req.query;

    if (!isValidISODateOnly(date)) {
      return res.status(400).json({ error: "date query param required: YYYY-MM-DD" });
    }

    const day = toDateOnlyUTC(date);

    // 1) Get all active daily tasks
    const tasks = await prisma.task.findMany({
      where: { active: true, isDaily: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true, name: true, category: true, sortOrder: true },
    });

    // 2) Get all logs for that date (all users)
    const logs = await prisma.dailyLog.findMany({
      where: { date: day },
      include: {
        user: { select: { id: true, name: true, email: true } },
        task: { select: { id: true, name: true, category: true } },
      },
      orderBy: [{ taskId: "asc" }, { id: "asc" }],
    });

    // 3) Group logs by taskId
    const logsByTaskId = new Map();
    for (const log of logs) {
      if (!logsByTaskId.has(log.taskId)) logsByTaskId.set(log.taskId, []);
      logsByTaskId.get(log.taskId).push(log);
    }

    // ) Build overview rows (one per task)
    const overview = tasks.map((t) => {
  const taskLogs = logsByTaskId.get(t.id) || [];

  const hasLogs = taskLogs.length > 0;
  const anyCompletedTrue = taskLogs.some((l) => l.completed === true);

  // Status rules:
  // - missing: no logs at all
  // - incomplete: there are logs but none marked completed
  // - completed: at least one completed:true
  let status = "missing";
  if (hasLogs && !anyCompletedTrue) status = "incomplete";
  if (anyCompletedTrue) status = "completed";

  return {
    taskId: t.id,
    taskName: t.name,
    category: t.category,
    sortOrder: t.sortOrder,

    status,
    warning: status !== "completed", // red exclamation if true

    logs: taskLogs.map((l) => ({
      id: l.id,
      completed: l.completed,
      quantityGrams: l.quantityGrams,
      notes: l.notes,
      user: l.user,
      createdAt: l.createdAt,
    })),
  };
});

    const missingTasks = overview.filter((t) => t.status === "missing");
    const incompleteTasks = overview.filter((t) => t.status === "incomplete");
    const completedTasks = overview.filter((t) => t.status === "completed");

    res.json({
      date,
      totals: {
        tasksTotal: overview.length,
        tasksMissing: missingTasks.length,
        tasksLoggedButNotCompleted: incompleteTasks.length,
        taskscompleted: completedTasks.length,
        logsTotal: logs.length,
      },
      tasks: overview,
      missingTasks: missingTasks.map((t) => ({
        taskId: t.taskId,
        taskName: t.taskName,
        category: t.category,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;