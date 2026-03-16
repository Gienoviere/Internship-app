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

function addDaysUTC(dateObj, days) {
  return new Date(dateObj.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * GET /admin/daily-overview?date=YYYY-MM-DD
 */
router.get("/daily-overview", requireAuth, requireRole(["ADMIN", "SUPERVISOR"]), async (req, res) => {
  try {
    const { date } = req.query;
    if (!isValidISODateOnly(date)) {
      return res.status(400).json({ error: "date query param required: YYYY-MM-DD" });
    }

    const day = toDateOnlyUTC(date);

    const tasks = await prisma.task.findMany({
      where: { active: true, isDaily: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true, name: true, category: true, sortOrder: true },
    });

    const logs = await prisma.dailyLog.findMany({
      where: { date: day },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ taskId: "asc" }, { id: "asc" }],
    });

    const logsByTaskId = new Map();
    for (const log of logs) {
      if (!logsByTaskId.has(log.taskId)) logsByTaskId.set(log.taskId, []);
      logsByTaskId.get(log.taskId).push(log);
    }

    const overview = tasks.map((t) => {
      const taskLogs = logsByTaskId.get(t.id) || [];
      const hasLogs = taskLogs.length > 0;
      const anyCompletedTrue = taskLogs.some((l) => l.completed === true);

      let status = "missing";
      if (hasLogs && !anyCompletedTrue) status = "incomplete";
      if (anyCompletedTrue) status = "completed";

      return {
        taskId: t.id,
        taskName: t.name,
        category: t.category,
        sortOrder: t.sortOrder,
        status,
        warning: status !== "completed",
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

    const missing = overview.filter((t) => t.status === "missing").length;
    const incomplete = overview.filter((t) => t.status === "incomplete").length;
    const completed = overview.filter((t) => t.status === "completed").length;

    res.json({
      date,
      totals: {
        tasksTotal: overview.length,
        completed,
        missing,
        incomplete,
        logsTotal: logs.length,
      },
      tasks: overview,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /admin/missed-tasks?date=YYYY-MM-DD
 */
router.get("/missed-tasks", requireAuth, requireRole(["ADMIN", "SUPERVISOR"]), async (req, res) => {
  try {
    const { date } = req.query;
    if (!isValidISODateOnly(date)) {
      return res.status(400).json({ error: "date query param required: YYYY-MM-DD" });
    }

    const day = toDateOnlyUTC(date);

    const tasks = await prisma.task.findMany({
      where: { active: true, isDaily: true },
      select: { id: true, name: true, category: true, sortOrder: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });

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
});

/**
 * GET /admin/inventory-warnings?lookbackDays=14&warnDays=21&criticalDays=7
 */
router.get("/inventory-warnings", requireAuth, requireRole(["ADMIN", "SUPERVISOR"]), async (req, res) => {
  try {
    const lookbackDays = Math.max(3, Math.min(60, Number(req.query.lookbackDays ?? 14)));
    const warnDays = Math.max(1, Math.min(365, Number(req.query.warnDays ?? 21)));
    const criticalDays = Math.max(1, Math.min(warnDays, Number(req.query.criticalDays ?? 7)));

    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const startUTC = addDaysUTC(todayUTC, -lookbackDays);

    const items = await prisma.feedItem.findMany({
      where: { active: true },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, stockGrams: true, reorderRule: true },
    });

    const moves = await prisma.inventoryMovement.findMany({
      where: {
        reason: "daily-log",
        date: { gte: startUTC, lte: todayUTC },
      },
      select: { feedItemId: true, date: true, deltaGrams: true },
    });

    const byItem = new Map();
    for (const m of moves) {
      if (m.deltaGrams >= 0) continue;
      const consumed = -m.deltaGrams;
      byItem.set(m.feedItemId, (byItem.get(m.feedItemId) ?? 0) + consumed);
    }

    const results = items.map((it) => {
      const totalConsumed = byItem.get(it.id) ?? 0;
      const avgDailyConsumed = totalConsumed / lookbackDays;

      let status = "INSUFFICIENT_DATA";
      let daysRemaining = null;

      if (totalConsumed === 0) status = "NO_CONSUMPTION";
      else if (avgDailyConsumed > 0) {
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
        avgDailyConsumedGrams: Math.round(avgDailyConsumed),
        estimatedDaysRemaining: daysRemaining === null ? null : Math.round(daysRemaining * 10) / 10,
        status,
        // optional for frontend modal
        suggestedOrderKg: null,
      };
    });

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
});

module.exports = router;

