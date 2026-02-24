const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");
const { buildDailySummary } = require("../services/dailySummaryService");

const router = express.Router();

router.get(
  "/export-daily.csv",
  requireAuth,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const { date } = req.query;
      const summary = await buildDailySummary(date);

      const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

      const rows = [];
      rows.push(`Date,${esc(summary.date)}`);
      rows.push(`MissedTasksCount,${summary.missedTasks.length}`);
      rows.push(`CriticalObservationsCount,${summary.criticalObservations.length}`);
      rows.push("");

      rows.push("Missed Tasks");
      rows.push("Task,Category");
      for (const t of summary.missedTasks) {
        rows.push(`${esc(t.name)},${esc(t.category)}`);
      }
      if (!summary.missedTasks.length) rows.push(`${esc("None")},${esc("")}`);

      rows.push("");
      rows.push("Critical Observations");
      rows.push("Title,AnimalTag,By,Description");
      for (const o of summary.criticalObservations) {
        rows.push(`${esc(o.title)},${esc(o.animalTag)},${esc(o.by)},${esc(o.description)}`);
      }
      if (!summary.criticalObservations.length) rows.push(`${esc("None")},${esc("")},${esc("")},${esc("")}`);

      rows.push("");
      rows.push("Inventory Warnings");
      rows.push("FeedItem,Status,StockGrams,AvgDailyConsumedGrams,EstimatedDaysRemaining,SuggestedOrderKg,ReorderRule");
      for (const i of summary.inventoryWarnings) {
        rows.push(
          [
            esc(i.name),
            esc(i.status),
            esc(i.stockGrams),
            esc(i.avgDailyConsumedGrams),
            esc(i.estimatedDaysRemaining ?? ""),
            esc(i.suggestedOrderKg ?? ""),
            esc(i.reorderRule ?? ""),
          ].join(",")
        );
      }

      const csv = rows.join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="daily-summary-${summary.date}.csv"`);
      res.send(csv);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || "Server error" });
    }
  }
);

module.exports = router;