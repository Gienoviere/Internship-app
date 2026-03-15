const express = require("express");
const prisma = require("../prisma");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

// list assignments for one task
router.get("/task/:taskId", requireAuth, requireRole(["ADMIN", "SUPERVISOR"]), async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    if (!Number.isInteger(taskId)) return res.status(400).json({ error: "Invalid taskId" });

    const assignments = await prisma.taskAssignment.findMany({
      where: { taskId, active: true },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, active: true },
        },
      },
      orderBy: [{ assignedAt: "desc" }],
    });

    res.json(assignments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// assign a user to a task
router.post("/", requireAuth, requireRole(["ADMIN", "SUPERVISOR"]), async (req, res) => {
  try {
    const { taskId, userId } = req.body;

    const tId = Number(taskId);
    const uId = Number(userId);

    if (!Number.isInteger(tId) || !Number.isInteger(uId)) {
      return res.status(400).json({ error: "taskId and userId must be integers" });
    }

    const assignment = await prisma.taskAssignment.upsert({
      where: {
        taskId_userId: {
          taskId: tId,
          userId: uId,
        },
      },
      update: {
        active: true,
      },
      create: {
        taskId: tId,
        userId: uId,
        active: true,
      },
      include: {
        task: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    res.status(201).json(assignment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// unassign
router.patch("/:id/deactivate", requireAuth, requireRole(["ADMIN", "SUPERVISOR"]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

    const assignment = await prisma.taskAssignment.update({
      where: { id },
      data: { active: false },
    });

    res.json(assignment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
