const express = require("express");
const prisma = require("../prisma");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");
const { createRestockEventForUser } = require("../lib/googleCalendar");

const router = express.Router();

// Hulpfunctie om datum/tijd te valideren en te converteren
function parseDateInput(dateStr) {
  // Accepteert "YYYY-MM-DD" of "YYYY-MM-DDTHH:mm"
  const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;
  if (!dateStr || !dateRegex.test(dateStr)) {
    return null;
  }
  // Als er geen tijd is, voeg middernacht toe (lokale tijd)
  let normalized = dateStr;
  if (!dateStr.includes('T')) {
    normalized += 'T00:00';
  }
  const date = new Date(normalized);
  // Controleer of de datum geldig is
  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
}

/**
 * GET /inventory/feed-items
 */
router.get("/feed-items", requireAuth, requireRole(["ADMIN", "SUPERVISOR"]), async (req, res) => {
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
 */
router.post("/feed-items", requireAuth, requireRole(["ADMIN", "SUPERVISOR"]), async (req, res) => {
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
 */
router.patch("/feed-items/:id", requireAuth, requireRole(["ADMIN", "SUPERVISOR"]), async (req, res) => {
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

    // low-stock calendar creation
    const before = await prisma.feedItem.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ error: "Feed item not found" });

    const item = await prisma.feedItem.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(stockGrams !== undefined ? { stockGrams: Math.round(grams) } : {}),
        ...(reorderRule !== undefined ? { reorderRule: reorderRule ? String(reorderRule) : null } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
      },
    });

    // crude threshold example; improve tomorrow if needed
    const threshold = 5000;

    // only trigger when it crosses from above threshold to at/below threshold
    if (
      stockGrams !== undefined &&
      before.stockGrams > threshold &&
      item.stockGrams <= threshold
    ) {
      try {
        await createRestockEventForUser(
          req.user.userId,
          item.name,
          item.stockGrams,
          threshold
        );
      } catch (err) {
        console.error("Calendar event creation failed:", err.message);
      }
    }

    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * DELETE /inventory/feed-items/:id
 */
router.delete("/feed-items/:id", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const item = await prisma.feedItem.findUnique({ where: { id } });
    if (!item) {
      return res.status(404).json({ error: "Feed item not found" });
    }

    await prisma.$transaction([
      prisma.inventoryMovement.deleteMany({ where: { feedItemId: id } }),
      prisma.feedItem.delete({ where: { id } })
    ]);

    res.json({ message: "Feed item and associated movements deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /inventory/movements
 */
router.post("/movements", requireAuth, requireRole(["ADMIN", "SUPERVISOR"]), async (req, res) => {
  try {
    const { feedItemId, date, deltaGrams, reason } = req.body || {};

    const fId = Number(feedItemId);
    if (!Number.isInteger(fId)) {
      return res.status(400).json({ error: "feedItemId must be an integer" });
    }

    const movementDate = parseDateInput(date);
    if (!movementDate) {
      return res.status(400).json({ error: "date must be in format YYYY-MM-DD or YYYY-MM-DDTHH:mm" });
    }

    const delta = Number(deltaGrams);
    if (!Number.isFinite(delta) || delta === 0) {
      return res.status(400).json({ error: "deltaGrams must be a non-zero number" });
    }

    if (!reason || typeof reason !== "string") {
      return res.status(400).json({ error: "reason is required" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.feedItem.findUnique({ where: { id: fId } });
      if (!item) throw new Error("FeedItem not found");

      const movement = await tx.inventoryMovement.create({
        data: {
          feedItemId: fId,
          date: movementDate, // nu een Date-object
          deltaGrams: Math.round(delta),
          reason: reason.trim(),
          userId: req.user.userId,
        },
      });

      const updated = await tx.feedItem.update({
        where: { id: fId },
        data: { stockGrams: item.stockGrams + Math.round(delta) },
      });

      const threshold = 5000;

      if (updated.stockGrams <= threshold) {
        try {
          await createRestockEventForUser(
            req.user.userId,
            updated.name,
            updated.stockGrams,
            threshold
          );
        } catch (err) {
          console.error("Calendar event creation failed:", err.message);
        }
      }

      return { movement, updated };
    });

    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    // Stuur de foutmelding naar de client voor debugging (tijdelijk)
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /inventory/movements
 */
router.get("/movements", requireAuth, requireRole(["ADMIN", "SUPERVISOR"]), async (req, res) => {
  try {
    const { feedItemId, date } = req.query;

    const where = {};

    if (feedItemId !== undefined) {
      const fId = Number(feedItemId);
      if (!Number.isInteger(fId)) return res.status(400).json({ error: "feedItemId must be an integer" });
      where.feedItemId = fId;
    }

    if (date !== undefined) {
      const movementDate = parseDateInput(date);
      if (!movementDate) {
        return res.status(400).json({ error: "date must be YYYY-MM-DD or YYYY-MM-DDTHH:mm" });
      }
      where.date = movementDate;
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

/**
 * DELETE /inventory/movements/:id
 */
router.delete("/movements/:id", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const movement = await prisma.inventoryMovement.findUnique({ where: { id } });
    if (!movement) {
      return res.status(404).json({ error: "Movement not found" });
    }

    await prisma.$transaction([
      prisma.feedItem.update({
        where: { id: movement.feedItemId },
        data: { stockGrams: { decrement: movement.deltaGrams } }
      }),
      prisma.inventoryMovement.delete({ where: { id } })
    ]);

    res.json({ message: "Movement deleted and stock adjusted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;