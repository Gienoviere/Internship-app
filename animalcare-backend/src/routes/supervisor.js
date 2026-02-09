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
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

// GET /supervisor/logs?date=YYYY-MM-DD&status=PENDING
router.get("/logs", requireAuth, requireRole(["SUPERVISOR", "ADMIN"]), async (req, res) => {
  try {
    const { date, status = "PENDING" } = req.query;
    if (!isValidISODateOnly(date)) {
      return res.status(400).json({ error: "date query param required: YYYY-MM-DD" });
    }

    const day = toDateOnlyUTC(date);

    const logs = await prisma.dailyLog.findMany({
      where: {
        date: day,
        approvalStatus: status,
      },
      include: {
        task: { select: { id: true, name: true, category: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ id: "desc" }],
    });

    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /supervisor/logs/:id
router.patch("/logs/:id", requireAuth, requireRole(["SUPERVISOR", "ADMIN"]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

    const { approvalStatus, supervisorNote } = req.body || {};
    if (!["APPROVED", "REJECTED"].includes(approvalStatus)) {
      return res.status(400).json({ error: "approvalStatus must be APPROVED or REJECTED" });
    }

    const updated = await prisma.dailyLog.update({
      where: { id },
      data: {
        approvalStatus,
        supervisorNote: supervisorNote ? String(supervisorNote) : null,
        reviewedAt: new Date(),
        reviewedById: req.user.userId,
      },
      include: {
        task: { select: { id: true, name: true, category: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;