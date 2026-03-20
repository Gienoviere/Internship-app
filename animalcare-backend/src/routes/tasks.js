const express = require("express");
const prisma = require("../prisma");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

function normalizeArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const isAdmin = req.user.role === "ADMIN";

    const tasks = await prisma.task.findMany({
      where: isAdmin ? {} : { active: true },
      orderBy: [{ animalCategory: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
    });

    res.json(
      tasks.map((task) => ({
        ...task,
        subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
        animalCategory: task.animalCategory || task.category || null,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      animalCategory,
      isDaily,
      sortOrder,
      active,
      affectsInventory,
      feedItemId,
      photoRequired,
      subtasks,
    } = req.body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }

    const task = await prisma.$transaction(async (tx) => {
      const createdTask = await tx.task.create({
        data: {
          name: name.trim(),
          description: description ? String(description).trim() : null,
          category: category ?? animalCategory ?? null,
          animalCategory: animalCategory ?? category ?? null,
          isDaily: typeof isDaily === "boolean" ? isDaily : true,
          sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
          active: typeof active === "boolean" ? active : true,
          affectsInventory: Boolean(affectsInventory),
          feedItemId: feedItemId === null || feedItemId === undefined || feedItemId === "" ? null : Number(feedItemId),
          photoRequired: Boolean(photoRequired),
          subtasks: normalizeArray(subtasks),
        },
      });

      const isManager = ["ADMIN", "SUPERVISOR"].includes(req.user.role);

      if (!isManager) {
        await tx.taskAssignment.upsert({
          where: {
            taskId_userId: {
              taskId: createdTask.id,
              userId: req.user.userId,
            },
          },
          update: { active: true },
          create: {
            taskId: createdTask.id,
            userId: req.user.userId,
            active: true,
          },
        });
      }

      return createdTask;
    });

    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error. Check that animalCategory, photoRequired and subtasks exist in Prisma and that TaskAssignment has taskId_userId unique.",
    });
  }
});

router.patch("/:id", requireAuth, requireRole(["ADMIN", "SUPERVISOR"]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

    const {
      name,
      description,
      category,
      animalCategory,
      isDaily,
      sortOrder,
      active,
      affectsInventory,
      feedItemId,
      photoRequired,
      subtasks,
    } = req.body || {};

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
        ...(category !== undefined ? { category: category ?? null } : {}),
        ...(animalCategory !== undefined ? { animalCategory: animalCategory ?? null } : {}),
        ...(isDaily !== undefined ? { isDaily: Boolean(isDaily) } : {}),
        ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
        ...(affectsInventory !== undefined ? { affectsInventory: Boolean(affectsInventory) } : {}),
        ...(feedItemId !== undefined ? { feedItemId: feedItemId === null || feedItemId === "" ? null : Number(feedItemId) } : {}),
        ...(photoRequired !== undefined ? { photoRequired: Boolean(photoRequired) } : {}),
        ...(subtasks !== undefined ? { subtasks: normalizeArray(subtasks) } : {}),
      },
    });

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", requireAuth, requireRole(["ADMIN", "SUPERVISOR"]), async (req, res) => {
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