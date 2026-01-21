const express = require("express");
const prisma = require("../prisma");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

/**
 * GET /tasks
 * - Admin: sees all (including inactive if desired)
 * - Users: sees active tasks only
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const isAdmin = req.user.role === "ADMIN";

    const tasks = await prisma.task.findMany({
      where: isAdmin ? {} : { active: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /tasks (ADMIN only)
 */
router.post("/", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const { name, description, category, isDaily, sortOrder, active } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "name is required" });
    }

    const task = await prisma.task.create({
      data: {
        name: name.trim(),
        description: description ?? null,
        category: category ?? null,
        isDaily: typeof isDaily === "boolean" ? isDaily : true,
        sortOrder: Number.isInteger(sortOrder) ? sortOrder : 0,
        active: typeof active === "boolean" ? active : true,
      },
    });

    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * PATCH /tasks/:id (ADMIN only)
 */
router.patch("/:id", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

    const { name, description, category, isDaily, sortOrder, active, affectsInventory, feedItemId } = req.body;

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(description !== undefined ? { description: description ?? null } : {}),
        ...(category !== undefined ? { category: category ?? null } : {}),
        ...(isDaily !== undefined ? { isDaily: Boolean(isDaily) } : {}),
        ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
        ...(affectsInventory !== undefined ? { affectsInventory: Boolean(affectsInventory) } : {}),
        ...(feedItemId !== undefined ? { feedItemId: feedItemId === null ? null : Number(feedItemId) } : {}),
      },
    });

    res.json(task);
  } catch (err) {
    // Prisma throws if id not found
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * DELETE /tasks/:id (ADMIN only)
 * We do a "soft delete": active=false
 */
router.delete("/:id", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

    const task = await prisma.task.update({
      where: { id },
      data: { active: false },
    });

    res.json({ ok: true, task });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;