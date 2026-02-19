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

/**
 * GET /admin/critical-observations?date=YYYY-MM-DD
 */
router.get(
  "/critical-observations",
  requireAuth,
  requireRole(["ADMIN"]),
  async (req, res) => {
    try {
      const { date } = req.query;

      if (!isValidISODateOnly(date)) {
        return res.status(400).json({ error: "date required YYYY-MM-DD" });
      }

      const day = toDateOnlyUTC(date);

      const items = await prisma.observation.findMany({
        where: {
          date: day,
          severity: "CRITICAL",
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          photos: true,
        },
        orderBy: [{ id: "desc" }],
      });

      res.json({
        date,
        count: items.length,
        items,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

module.exports = router;