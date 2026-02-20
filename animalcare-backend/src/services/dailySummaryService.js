const prisma = require("../prisma");

function isValidISODateOnly(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function toDateOnlyUTC(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

async function buildDailySummary(dateStr) {
  if (!isValidISODateOnly(dateStr)) throw new Error("date must be YYYY-MM-DD");
  const day = toDateOnlyUTC(dateStr);

  // 1) Missed tasks
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

  // 2) Inventory warnings (reuse your existing service)
  // If you already have getInventoryWarnings service, use it.
  const feedItems = await prisma.feedItem.findMany({
    where: { active: true },
    select: { id: true, name: true, stockGrams: true, reorderRule: true },
    orderBy: [{ name: "asc" }],
  });

  // 3) Critical observations
  const criticalObs = await prisma.observation.findMany({
    where: { date: day, severity: "CRITICAL" },
    include: { createdBy: { select: { name: true, email: true } } },
    orderBy: [{ id: "desc" }],
  });

  return {
    date: dateStr,
    totals: {
      tasksTotal: tasks.length,
      logsTotal: logs.length,
      missedTasks: missed.length,
      criticalObservations: criticalObs.length,
      feedItems: feedItems.length,
    },
    missedTasks: missed.map((t) => ({ name: t.name, category: t.category })),
    criticalObservations: criticalObs.map((o) => ({
      title: o.title,
      animalTag: o.animalTag,
      by: o.createdBy?.name || o.createdBy?.email,
      description: o.description,
    })),
    feedItems, // basic for now (we’ll add warning status next if you want)
  };
}

module.exports = { buildDailySummary };