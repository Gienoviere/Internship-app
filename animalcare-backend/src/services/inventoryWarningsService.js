const prisma = require("../prisma");

function ceilToMultiple(value, multiple) {
  if (!multiple || multiple <= 0) return Math.ceil(value);
  return Math.ceil(value / multiple) * multiple;
}

async function getInventoryWarnings({
  lookbackDays = 14,
  warnDays = 21,
  criticalDays = 7,
}) {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ));

  const startUTC = new Date(todayUTC);
  startUTC.setUTCDate(startUTC.getUTCDate() - lookbackDays);

  const items = await prisma.feedItem.findMany({
    where: { active: true },
  });

  const moves = await prisma.inventoryMovement.findMany({
    where: {
      reason: "daily-log",
      date: { gte: startUTC, lte: todayUTC },
    },
  });

  const byItem = new Map();
  for (const m of moves) {
    if (m.deltaGrams >= 0) continue;
    const key = m.feedItemId;
    byItem.set(key, (byItem.get(key) || 0) + (-m.deltaGrams));
  }

  return items.map((it) => {
    const totalConsumed = byItem.get(it.id) || 0;
    const avgDaily = totalConsumed / lookbackDays;

    let daysRemaining = null;
    let status = "INSUFFICIENT_DATA";

    if (avgDaily > 0) {
      daysRemaining = it.stockGrams / avgDaily;
      if (daysRemaining <= criticalDays) status = "CRITICAL";
      else if (daysRemaining <= warnDays) status = "WARN";
      else status = "OK";
    }

    let suggestedOrderKg = null;
    if (avgDaily > 0) {
      const target = avgDaily * warnDays;
      const needed = Math.max(0, target - it.stockGrams);
      if (needed > 0) {
        let kg = needed / 1000;
        if (it.minOrderKg && kg < it.minOrderKg) kg = it.minOrderKg;
        if (it.orderMultipleKg) kg = ceilToMultiple(kg, it.orderMultipleKg);
        suggestedOrderKg = kg;
      }
    }

    return {
      feedItemId: it.id,
      name: it.name,
      status,
      stockGrams: it.stockGrams,
      avgDailyConsumedGrams: Math.round(avgDaily),
      estimatedDaysRemaining: daysRemaining && Math.round(daysRemaining),
      suggestedOrderKg,
      reorderRule: it.reorderRule,
    };
  });
}

module.exports = { getInventoryWarnings };