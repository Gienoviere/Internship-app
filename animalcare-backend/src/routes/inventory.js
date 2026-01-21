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
 */
router.get("/feed-items", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
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
 * Body: { name, stockGrams, reorderRule? }
 */
router.post("/feed-items", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const { name, stockGrams, reorderRule } = req.body || {};

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "name is required" });
    }

    const grams =
      stockGrams === undefined || stockGrams === null ? 0 : Number(stockGrams);
    if (!Number.isFinite(grams) || grams < 0) {
      return res.status(400).json({ error: "stockGrams must be a non-negative number" });
    }

    const item = await prisma.feedItem.create({
      data: {
        name: name.trim(),
        stockGrams: Math.round(grams),
        reorderRule: reorderRule ? String(reorderRule) : null,
      },
    });

    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * PATCH /inventory/feed-items/:id
 * Body can include: stockGrams, reorderRule, active, name
 */
router.patch("/feed-items/:id", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

    const { name, stockGrams, reorderRule, active } = req.body || {};

    let grams;
    if (stockGrams !== undefined) {
      grams = Number(stockGrams);
      if (!Number.isFinite(grams) || grams < 0) {
        return res.status(400).json({ error: "stockGrams must be a non-negative number" });
      }
    }

    const item = await prisma.feedItem.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(stockGrams !== undefined ? { stockGrams: Math.round(grams) } : {}),
        ...(reorderRule !== undefined ? { reorderRule: reorderRule ? String(reorderRule) : null } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
      },
    });

    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /inventory/movements
 * Body: { feedItemId, date:"YYYY-MM-DD", deltaGrams, reason }
 */
router.post("/movements", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const { feedItemId, date, deltaGrams, reason } = req.body || {};

    const fId = Number(feedItemId);
    if (!Number.isInteger(fId)) return res.status(400).json({ error: "feedItemId must be an integer" });

    if (!isValidISODateOnly(date)) {
      return res.status(400).json({ error: "date is required: YYYY-MM-DD" });
    }

    const delta = Number(deltaGrams);
    if (!Number.isFinite(delta) || delta === 0) {
      return res.status(400).json({ error: "deltaGrams must be a non-zero number" });
    }

    if (!reason || typeof reason !== "string") {
      return res.status(400).json({ error: "reason is required" });
    }

    const day = toDateOnlyUTC(date);

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.feedItem.findUnique({ where: { id: fId } });
      if (!item) throw new Error("FeedItem not found");

      const movement = await tx.inventoryMovement.create({
        data: {
          feedItemId: fId,
          date: day,
          deltaGrams: Math.round(delta),
          reason: reason.trim(),
          userId: req.user.userId,
        },
      });

      const updated = await tx.feedItem.update({
        where: { id: fId },
        data: { stockGrams: item.stockGrams + Math.round(delta) },
      });

      return { movement, updated };
    });

    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /inventory/movements?feedItemId=1&date=YYYY-MM-DD
 */
router.get("/movements", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const { feedItemId, date } = req.query;

    const where = {};

    if (feedItemId !== undefined) {
      const fId = Number(feedItemId);
      if (!Number.isInteger(fId)) return res.status(400).json({ error: "feedItemId must be an integer" });
      where.feedItemId = fId;
    }

    if (date !== undefined) {
      if (!isValidISODateOnly(date)) return res.status(400).json({ error: "date must be YYYY-MM-DD" });
      where.date = toDateOnlyUTC(date);
    }

    const moves = await prisma.inventoryMovement.findMany({
      where,
      include: { feedItem: { select: { id: true, name: true } } },
      orderBy: [{ createdAt: "desc" }],
      take: 200,
    });

    res.json(moves);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
