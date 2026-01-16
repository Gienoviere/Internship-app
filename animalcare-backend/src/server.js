const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const tasksRoutes = require("./routes/tasks");
const dailyLogsRoutes = require("./routes/dailyLogs");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/auth", authRoutes);
app.use("/tasks", tasksRoutes);
app.use("/daily-logs", dailyLogsRoutes);

// Start server LAST
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});