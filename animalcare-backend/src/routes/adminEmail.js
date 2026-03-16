const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");
const { buildDailySummary } = require("../services/dailySummaryService");
const { sendMail } = require("../services/mailService");

const router = express.Router();

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[c]));
}

router.post(
  "/send-daily-summary",
  requireAuth,
  requireRole(["ADMIN", "SUPERVISOR"]),
  async (req, res) => {
    try {
      const { date, lookbackDays, warnDays, criticalDays } = req.body || {};
      const to = process.env.ADMIN_EMAIL;
      if (!to) return res.status(500).json({ error: "ADMIN_EMAIL missing in .env" });

      const summary = await buildDailySummary(date, {
        lookbackDays: Number(lookbackDays ?? 14),
        warnDays: Number(warnDays ?? 21),
        criticalDays: Number(criticalDays ?? 7),
      });

      const subject = `AnimalCare Daily Summary — ${summary.date}`;

      const missedHtml = summary.missedTasks.length
        ? `<ul>${summary.missedTasks.map(t => `<li>${esc(t.name)} (${esc(t.category)})</li>`).join("")}</ul>`
        : `<div>None 🎉</div>`;

      const critHtml = summary.criticalObservations.length
        ? `<ul>${summary.criticalObservations.map(o =>
            `<li><strong>${esc(o.title)}</strong> — ${esc(o.animalTag)} — ${esc(o.by)}${o.description ? ` — ${esc(o.description)}` : ""}</li>`
          ).join("")}</ul>`
        : `<div>None</div>`;

      const invWorst = summary.inventoryWarnings
        .filter(i => i.status === "CRITICAL" || i.status === "WARN")
        .slice(0, 8);

      const invHtml = invWorst.length
        ? `<table border="1" cellspacing="0" cellpadding="6">
            <tr><th>Feed</th><th>Status</th><th>Stock (g)</th><th>Avg/day (g)</th><th>Days left</th><th>Suggested order (kg)</th></tr>
            ${invWorst.map(i => `
              <tr>
                <td>${esc(i.name)}</td>
                <td>${esc(i.status)}</td>
                <td>${i.stockGrams}</td>
                <td>${i.avgDailyConsumedGrams}</td>
                <td>${i.estimatedDaysRemaining ?? ""}</td>
                <td>${i.suggestedOrderKg ?? ""}</td>
              </tr>
            `).join("")}
          </table>`
        : `<div>No warnings</div>`;

      const html = `
        <h2>Daily Summary — ${esc(summary.date)}</h2>

        <h3>1) Missed Tasks</h3>
        ${missedHtml}

        <h3>2) Critical Observations</h3>
        ${critHtml}

        <h3>3) Inventory Warnings</h3>
        ${invHtml}
      `;

      const text = [
        `Daily Summary — ${summary.date}`,
        ``,
        `Missed tasks: ${summary.missedTasks.length}`,
        `Critical observations: ${summary.criticalObservations.length}`,
        `Inventory warnings: ${summary.inventoryWarnings.filter(i => i.status === "CRITICAL" || i.status === "WARN").length}`,
      ].join("\n");

      await sendMail({ to, subject, text, html });

      res.json({ ok: true, sentTo: to, subject });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || "Server error" });
    }
  }
);

module.exports = router;