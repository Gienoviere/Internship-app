const express = require("express");
const prisma = require("../prisma");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");
const { getInventoryWarnings } = require("../services/inventoryWarningsService");

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

// Helpers (if you already have these in admin.js, reuse them)
function toDateOnlyUTC(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}
function addDaysUTC(dateObj, days) {
  return new Date(dateObj.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * GET /admin/inventory-warnings?lookbackDays=14&warnDays=21&criticalDays=7
 * Admin-only: estimates days remaining based on recent consumption movements.
 *
 * Uses InventoryMovement:
 * - reason="daily-log"
 * - deltaGrams negative => consumption
 */
router.get("/inventory-warnings", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const lookbackDays = Math.max(3, Math.min(60, Number(req.query.lookbackDays ?? 14)));
      const warnDays = Math.max(1, Math.min(365, Number(req.query.warnDays ?? 21)));
      const criticalDays = Math.max(1, Math.min(warnDays, Number(req.query.criticalDays ?? 7)));

      // We’ll use UTC "today" at midnight
      const now = new Date();
      const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
      const startUTC = addDaysUTC(todayUTC, -lookbackDays);

      // 1) Get all active feed items
      const items = await prisma.feedItem.findMany({
        where: { active: true },
        orderBy: [{ name: "asc" }],
        select: { id: true, name: true, stockGrams: true, reorderRule: true },
      });

      // 2) Get consumption movements in lookback window (daily-log only)
      const moves = await prisma.inventoryMovement.findMany({
        where: {
          reason: "daily-log",
          date: { gte: startUTC, lte: todayUTC },
        },
        select: { feedItemId: true, date: true, deltaGrams: true },
      });

      // Group consumption by feedItemId and by date
      // We want average DAILY consumption (in grams/day)
      const byItem = new Map(); // feedItemId -> Map(dateISO -> gramsConsumed)
      for (const m of moves) {
        if (m.deltaGrams >= 0) continue; // only consumption
        const dayKey = m.date.toISOString().slice(0, 10); // YYYY-MM-DD
        const consumed = -m.deltaGrams; // convert to positive grams consumed

        if (!byItem.has(m.feedItemId)) byItem.set(m.feedItemId, new Map());
        const byDay = byItem.get(m.feedItemId);
        byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + consumed);
      }

      const results = items.map((it) => {
        const perDay = byItem.get(it.id) || new Map();
        const daysWithData = perDay.size;

        // Total consumed in lookback window (only days we have entries for)
        let totalConsumed = 0;
        for (const v of perDay.values()) totalConsumed += v;

        // Two possible averages:
        // A) avg over days with data (good when logs are consistent)
        // B) avg over full lookback window (more conservative if logging is spotty)
        //
        // We'll use B so you still get a warning even if someone skipped logging a day.
        const avgDailyConsumed = totalConsumed / lookbackDays;

        let status = "INSUFFICIENT_DATA";
        let daysRemaining = null;

        if (totalConsumed === 0) {
          status = "NO_CONSUMPTION";
        } else if (avgDailyConsumed > 0) {
          daysRemaining = it.stockGrams / avgDailyConsumed;

          if (daysRemaining <= criticalDays) status = "CRITICAL";
          else if (daysRemaining <= warnDays) status = "WARN";
          else status = "OK";
        }

        return {
          feedItemId: it.id,
          name: it.name,
          stockGrams: it.stockGrams,
          reorderRule: it.reorderRule,
          lookbackDays,
          daysWithConsumptionEntries: daysWithData,
          totalConsumedGrams: Math.round(totalConsumed),
          avgDailyConsumedGrams: Math.round(avgDailyConsumed),
          estimatedDaysRemaining: daysRemaining === null ? null : Math.round(daysRemaining * 10) / 10, // 1 decimal
          status,
        };
      });

      // Sort by “worst” first
      const order = { CRITICAL: 0, WARN: 1, OK: 2, NO_CONSUMPTION: 3, INSUFFICIENT_DATA: 4 };
      results.sort((a, b) => (order[a.status] ?? 99) - (order[b.status] ?? 99));

      res.json({
        asOfDateUTC: todayUTC.toISOString().slice(0, 10),
        params: { lookbackDays, warnDays, criticalDays },
        items: results,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

//Warning system voor admin
function isValidISODateOnly(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toDateOnlyUTC(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

// GET /admin/missed-tasks?date=YYYY-MM-DD
router.get(
  "/missed-tasks",
  requireAuth,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const { date } = req.query;
      if (!isValidISODateOnly(date)) {
        return res.status(400).json({ error: "date query param required: YYYY-MM-DD" });
      }

      const day = toDateOnlyUTC(date);

      // all active daily tasks
      const tasks = await prisma.task.findMany({
        where: { active: true, isDaily: true },
        select: { id: true, name: true, category: true, sortOrder: true },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      });

      // all logs for that day
      const logs = await prisma.dailyLog.findMany({
        where: { date: day },
        select: { taskId: true },
      });

      const loggedTaskIds = new Set(logs.map((l) => l.taskId));
      const missed = tasks.filter((t) => !loggedTaskIds.has(t.id));

      res.json({
        date,
        missedCount: missed.length,
        missedTasks: missed,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);
