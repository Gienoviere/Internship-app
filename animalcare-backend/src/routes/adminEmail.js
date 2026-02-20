const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");
const { buildDailySummary } = require("../services/dailySummaryService");
const { sendMail } = require("../services/mailService");

const router = express.Router();

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

router.post(
  "/send-daily-summary",
  requireAuth,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const { date } = req.body || {};
      const to = process.env.ADMIN_EMAIL;

      const summary = await buildDailySummary(date);

      const subject = `AnimalCare Daily Summary — ${summary.date}`;

      const text = [
        `Daily Summary ${summary.date}`,
        `Missed tasks: ${summary.totals.missedTasks}`,
        `Critical observations: ${summary.totals.criticalObservations}`,
      ].join("\n");

      const html = `
        <h2>Daily Summary — ${escapeHtml(summary.date)}</h2>
        <p><strong>Missed tasks:</strong> ${summary.totals.missedTasks}</p>
        <ul>
          ${summary.missedTasks.map(t => `<li>${escapeHtml(t.name)} (${escapeHtml(t.category || "—")})</li>`).join("") || "<li>None</li>"}
        </ul>

        <p><strong>Critical observations:</strong> ${summary.totals.criticalObservations}</p>
        <ul>
          ${summary.criticalObservations.map(o => `<li><strong>${escapeHtml(o.title)}</strong> — ${escapeHtml(o.animalTag || "—")} — ${escapeHtml(o.by || "—")}${o.description ? ` — ${escapeHtml(o.description)}` : ""}</li>`).join("") || "<li>None</li>"}
        </ul>
      `;

      await sendMail({ to, subject, text, html });

      res.json({ ok: true, sentTo: to, subject });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || "Server error" });
    }
  }
);

module.exports = router;