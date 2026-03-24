const express = require("express");
const prisma = require("../prisma");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

function normalizeSubtasks(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (typeof item === "string") {
        const title = item.trim();
        if (!title) return null;
        return {
          id: `sub_${index + 1}`,
          title,
          amount: null,
          unit: "g",
          feedItemId: null,
          affectsInventory: false,
          required: true,
          sortOrder: index,
        };
      }

      if (!item || typeof item !== "object") return null;

      const title = String(item.title || "").trim();
      if (!title) return null;

      const amount =
        item.amount === null || item.amount === undefined || item.amount === ""
          ? null
          : Number(item.amount);

      return {
        id: String(item.id || `sub_${index + 1}`),
        title,
        amount: Number.isFinite(amount) && amount >= 0 ? amount : null,
        unit: String(item.unit || "g").trim() || "g",
        feedItemId:
          item.feedItemId === null ||
          item.feedItemId === undefined ||
          item.feedItemId === ""
            ? null
            : Number(item.feedItemId),
        affectsInventory: Boolean(item.affectsInventory),
        required: item.required === undefined ? true : Boolean(item.required),
        sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const isManager = ["ADMIN", "SUPERVISOR"].includes(req.user.role);

    const tasks = await prisma.task.findMany({
      where: isManager ? {} : { active: true },
      include: {
        feedItem: { select: { id: true, name: true, unit: true } },
      },
      orderBy: [{ animalCategory: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
    });

    res.json(
      tasks.map((task) => ({
        ...task,
        subtasks: normalizeSubtasks(task.subtasks),
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

    const normalizedSubtasks = normalizeSubtasks(subtasks);

    const hasSubtaskInventory = normalizedSubtasks.some(
      (s) => s.affectsInventory && s.feedItemId
    );

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
          affectsInventory: Boolean(affectsInventory || hasSubtaskInventory),
          feedItemId:
            feedItemId === null || feedItemId === undefined || feedItemId === ""
              ? null
              : Number(feedItemId),
          photoRequired: Boolean(photoRequired),
          subtasks: normalizedSubtasks,
        },
        include: {
          feedItem: { select: { id: true, name: true, unit: true } },
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

    res.status(201).json({
      ...task,
      subtasks: normalizeSubtasks(task.subtasks),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while creating task" });
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

    const normalizedSubtasks =
      subtasks === undefined ? undefined : normalizeSubtasks(subtasks);

    const hasSubtaskInventory =
      normalizedSubtasks?.some((s) => s.affectsInventory && s.feedItemId) || false;

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(description !== undefined
          ? { description: description ? String(description).trim() : null }
          : {}),
        ...(category !== undefined ? { category: category ?? null } : {}),
        ...(animalCategory !== undefined ? { animalCategory: animalCategory ?? null } : {}),
        ...(isDaily !== undefined ? { isDaily: Boolean(isDaily) } : {}),
        ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
        ...(affectsInventory !== undefined || normalizedSubtasks !== undefined
          ? { affectsInventory: Boolean(affectsInventory || hasSubtaskInventory) }
          : {}),
        ...(feedItemId !== undefined
          ? {
              feedItemId:
                feedItemId === null || feedItemId === ""
                  ? null
                  : Number(feedItemId),
            }
          : {}),
        ...(photoRequired !== undefined ? { photoRequired: Boolean(photoRequired) } : {}),
        ...(normalizedSubtasks !== undefined ? { subtasks: normalizedSubtasks } : {}),
      },
      include: {
        feedItem: { select: { id: true, name: true, unit: true } },
      },
    });

    res.json({
      ...task,
      subtasks: normalizeSubtasks(task.subtasks),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while updating task" });
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
    res.status(500).json({ error: "Server error while deleting task" });
  }
});

module.exports = router;