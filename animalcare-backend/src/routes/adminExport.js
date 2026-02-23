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

      const rows = [];
      rows.push(["Date", summary.date].join(","));
      rows.push(["MissedTasksCount", summary.totals.missedTasks].join(","));
      rows.push(["CriticalObservationsCount", summary.totals.criticalObservations].join(","));
      rows.push("");
      rows.push("Missed Tasks");
      rows.push("Task,Category");
      for (const t of summary.missedTasks) {
        rows.push(`"${String(t.name).replace(/"/g,'""')}","${String(t.category||"").replace(/"/g,'""')}"`);
      }
      rows.push("");
      rows.push("Critical Observations");
      rows.push("Title,AnimalTag,By,Description");
      for (const o of summary.criticalObservations) {
        rows.push(
          `"${String(o.title||"").replace(/"/g,'""')}",` +
          `"${String(o.animalTag||"").replace(/"/g,'""')}",` +
          `"${String(o.by||"").replace(/"/g,'""')}",` +
          `"${String(o.description||"").replace(/"/g,'""')}"`
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