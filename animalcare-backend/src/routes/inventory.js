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
 * GET /inventory/feed-items
 * List all feed/inventory items
 */
router.get("/feed-items", requireAuth, async (req, res) => {
  try {
    const items = await prisma.feedItem.findMany({
      orderBy: [{ name: "asc" }],
    });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /inventory/feed-items
 * Create inventory/feed item
 */
router.post("/feed-items", requireAuth, requireRole(["ADMIN", "SUPERVISOR"]), async (req, res) => {
  try {
    const { name, stockGrams, unit, minStockGrams } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "name is required" });
    }

    const created = await prisma.feedItem.create({
      data: {
        name: String(name).trim(),
        stockGrams: Number.isFinite(Number(stockGrams)) ? Number(stockGrams) : 0,
        unit: unit ? String(unit).trim() : "g",
        minStockGrams: Number.isFinite(Number(minStockGrams)) ? Number(minStockGrams) : 0,
      },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * PATCH /inventory/feed-items/:id
 * Update inventory/feed item
 */
router.patch("/feed-items/:id", requireAuth, requireRole(["ADMIN", "SUPERVISOR"]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const { name, stockGrams, unit, minStockGrams } = req.body || {};

    const updated = await prisma.feedItem.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(stockGrams !== undefined ? { stockGrams: Number(stockGrams) } : {}),
        ...(unit !== undefined ? { unit: String(unit).trim() } : {}),
        ...(minStockGrams !== undefined ? { minStockGrams: Number(minStockGrams) } : {}),
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /inventory/movements?date=YYYY-MM-DD
 * List movements for a date or all if omitted
 */
router.get("/movements", requireAuth, async (req, res) => {
  try {
    const { date } = req.query;

    const where = {};
    if (date) {
      if (!isValidISODateOnly(date)) {
        return res.status(400).json({ error: "date must be YYYY-MM-DD" });
      }

      const day = toDateOnlyUTC(date);
      const nextDay = new Date(day);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);

      where.date = {
        gte: day,
        lt: nextDay,
      };
    }

    const movements = await prisma.inventoryMovement.findMany({
      where,
      include: {
        feedItem: true,
      },
      orderBy: [{ date: "desc" }, { id: "desc" }],
    });

    res.json(movements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /inventory/movements
 * Add manual stock movement
 */
router.post("/movements", requireAuth, requireRole(["ADMIN", "SUPERVISOR"]), async (req, res) => {
  try {
    const { feedItemId, date, deltaGrams, reason } = req.body || {};

    const itemId = Number(feedItemId);
    if (!Number.isInteger(itemId)) {
      return res.status(400).json({ error: "feedItemId must be an integer" });
    }

    if (!isValidISODateOnly(date)) {
      return res.status(400).json({ error: "date must be YYYY-MM-DD" });
    }

    const delta = Number(deltaGrams);
    if (!Number.isFinite(delta) || delta === 0) {
      return res.status(400).json({ error: "deltaGrams must be a non-zero number" });
    }

    const day = toDateOnlyUTC(date);

    const result = await prisma.$transaction(async (tx) => {
      const movement = await tx.inventoryMovement.create({
        data: {
          feedItemId: itemId,
          date: day,
          deltaGrams: Math.round(delta),
          reason: reason ? String(reason) : "manual",
          userId: req.user.userId,
        },
      });

      const item = await tx.feedItem.update({
        where: { id: itemId },
        data: {
          stockGrams: {
            increment: Math.round(delta),
          },
        },
      });

      return { movement, item };
    });

    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;