const express = require("express");
const prisma = require("../prisma");
const requireAuth = require("../middleware/requireAuth");
const nodemailer = require("nodemailer");
const router = express.Router();

function isValidISODateOnly(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toDateOnlyUTC(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

function nextDayUTC(day) {
  const n = new Date(day);
  n.setUTCDate(n.getUTCDate() + 1);
  return n;
}

function toTimeLabel(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

router.get("/summary", requireAuth, async (req, res) => {
  try {
    const { date } = req.query;

    if (!isValidISODateOnly(date)) {
      return res.status(400).json({ error: "date query param required: YYYY-MM-DD" });
    }

    const day = toDateOnlyUTC(date);
    const next = nextDayUTC(day);

    const [tasks, logs, pendingApprovals] = await Promise.all([
      prisma.task.findMany({
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        where: { active: true, isDaily: true },
        include: {
          assignments: {
            where: { active: true },
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            }
          }
        }
      }),

      prisma.dailyLog.findMany({
        where: { date: { gte: day, lt: next } },
        include: {
          task: { select: { id: true, name: true, category: true } },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ id: "desc" }],
      }),
      prisma.dailyLog.count({
        where: {
          date: { gte: day, lt: next },
          approvalStatus: "PENDING",
        },
      }),
    ]);

    const logsByTask = new Map();
    for (const log of logs) {
      if (!logsByTask.has(log.taskId)) logsByTask.set(log.taskId, []);
      logsByTask.get(log.taskId).push(log);
    }

    const overview = tasks.map((task) => {
      const taskLogs = logsByTask.get(task.id) || [];
      const validLogs = taskLogs.filter((l) => l.approvalStatus !== "REJECTED");

      let status = "Not done";
      if (validLogs.some((l) => l.completed)) status = "Completed";
      else if (validLogs.length > 0) status = "Logged";

      const assignedUsers = (task.assignments || [])
        .map(a => a.user?.name || a.user?.email)
        .filter(Boolean);

      const loggedBy = [...new Set(
        validLogs
          .map((l) => l.user?.name || l.user?.email)
          .filter(Boolean)
      )];

      return {
        taskId: task.id,
        taskName: task.name,
        status,
        loggedBy,
        assignedUsers
      };
    });

    const completedCount = overview.filter((o) => o.status === "Completed").length;
    const totalTasks = tasks.length;
    const completionPercent = totalTasks ? Math.round((completedCount / totalTasks) * 100) : 0;

    const activeUsers = new Set(logs.map((l) => l.userId)).size;

    const recentActivity = logs
      .filter((l) => l.completed)
      .slice(0, 20)
      .map((log) => ({
        time: toTimeLabel(log.createdAt || log.date),
        action: "Task completed",
        by: log.user?.name || log.user?.email || "Unknown",
        details: log.task?.name || "Task",
      }));

    res.json({
      date,
      totals: {
        totalTasks,
        completedCount,
        completionPercent,
        activeUsers,
        warnings: pendingApprovals,
        pendingApprovals,
      },
      overview,
      recentActivity,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/export.csv", requireAuth, async (req, res) => {
  try {
    const { date } = req.query;

    if (!isValidISODateOnly(date)) {
      return res.status(400).json({ error: "date query param required: YYYY-MM-DD" });
    }

    const day = toDateOnlyUTC(date);
    const next = nextDayUTC(day);

    const logs = await prisma.dailyLog.findMany({
      where: { date: { gte: day, lt: next } },
      include: {
        task: { select: { name: true, category: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: [{ id: "asc" }],
    });

    const escapeCsv = (value) => {
      const s = value == null ? "" : String(value);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const rows = [
      [
        "Date",
        "Time",
        "Task",
        "Category",
        "Completed",
        "Approval Status",
        "User",
        "Quantity (g)",
        "Notes",
      ],
      ...logs.map((log) => [
        date,
        toTimeLabel(log.createdAt || log.date),
        log.task?.name || "",
        log.task?.category || "",
        log.completed ? "Yes" : "No",
        log.approvalStatus || "",
        log.user?.name || log.user?.email || "",
        log.quantityGrams ?? "",
        log.notes || "",
      ]),
    ];

    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="animalcare-${date}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// in connection with the email
router.post("/send-summary", requireAuth, async (req, res) => {
  try {
    const { date, recipients } = req.body;

    if (!isValidISODateOnly(date)) {
      return res.status(400).json({ error: "Valid date required (YYYY-MM-DD)." });
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: "At least one recipient is required." });
    }

    const day = toDateOnlyUTC(date);
    const next = nextDayUTC(day);

    const logs = await prisma.dailyLog.findMany({
      where: {
        date: {
          gte: day,
          lt: next
        }
      },
      include: {
        task: { select: { name: true, category: true } },
        user: { select: { name: true, email: true } }
      },
      orderBy: [{ id: "asc" }]
    });

    const completedCount = logs.filter(l => l.completed).length;

    const lines = logs.map((log) => {
      const task = log.task?.name || "Task";
      const by = log.user?.name || log.user?.email || "Unknown";
      const qty = log.quantityGrams != null ? `${log.quantityGrams}g` : "—";
      const notes = log.notes || "—";
      const status = log.completed ? "Completed" : "Logged";

      return `- ${task} | ${status} | by ${by} | qty: ${qty} | notes: ${notes}`;
    });

    const text = [
      `AnimalCare daily summary for ${date}`,
      ``,
      `Total logs: ${logs.length}`,
      `Completed tasks: ${completedCount}`,
      ``,
      `Entries:`,
      ...(lines.length ? lines : ["No logs found for this date."])
    ].join("\n");

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipients.join(", "),
      subject: `AnimalCare summary - ${date}`,
      text
    });

    res.json({ ok: true, sentTo: recipients });
  } catch (err) {
    console.error("send-summary failed:", err);
    res.status(500).json({ error: "Failed to send summary email." });
  }
});


module.exports = router;