const express = require("express");
const prisma = require("../prisma");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

function isValidISODateOnly(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toDateOnlyUTC(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

router.get("/today", requireAuth, async (req, res) => {
  try {
    const date = req.query.date;
    if (!isValidISODateOnly(date)) {
      return res.status(400).json({ error: "date query param required: YYYY-MM-DD" });
    }

    const day = toDateOnlyUTC(date);
    const nextDay = new Date(day);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const isManager = ["ADMIN", "SUPERVISOR"].includes(req.user.role);

    const taskWhere = isManager
      ? { active: true, isDaily: true }
      : {
          active: true,
          isDaily: true,
          assignments: {
            some: {
              userId: req.user.userId,
              active: true,
            },
          },
        };

    const tasks = await prisma.task.findMany({
      where: taskWhere,
      include: {
        feedItem: { select: { name: true } },
      },
      orderBy: [{ animalCategory: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
    });

    const myLogs = await prisma.dailyLog.findMany({
      where: {
        userId: req.user.userId,
        date: { gte: day, lt: nextDay },
      },
      orderBy: [{ id: "desc" }],
    });

    const byTaskId = new Map(myLogs.map((log) => [log.taskId, log]));

    res.json({
      date,
      tasks: tasks.map((task) => {
        const log = byTaskId.get(task.id) || null;
        return {
          taskId: task.id,
          taskName: task.name,
          category: task.category,
          animalCategory: task.animalCategory || task.category || "Uncategorized",
          description: task.description,
          subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
          photoRequired: Boolean(task.photoRequired),
          feedItemName: task.feedItem?.name || null,
          logged: Boolean(log),
          completed: log ? log.completed : false,
          quantityGrams: log ? log.quantityGrams : null,
          notes: log ? log.notes : null,
          photoUrl: log?.photoUrl || null,
          completedSubtasks: Array.isArray(log?.completedSubtasks) ? log.completedSubtasks : [],
          logId: log ? log.id : null,
          approvalStatus: log?.approvalStatus || null,
        };
      }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;