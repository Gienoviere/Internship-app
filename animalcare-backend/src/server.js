const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./cron/inventoryWarningsCron"); 

const authRoutes = require("./routes/auth");
const tasksRoutes = require("./routes/tasks");
const taskStatusRoutes = require("./routes/taskStatus");
const dailyLogsRoutes = require("./routes/dailyLogs");
const adminRoutes = require("./routes/admin");
const inventoryRoutes = require("./routes/inventory");
const supervisorRoutes = require("./routes/supervisor");
//const inventoryWarnings = ("./admin/inventory-warnings");
const observationsRoutes = require("./routes/observations");
const adminCriticalRoutes = require("./routes/adminCritical");
const adminEmailRoutes = require("./routes/adminEmail");
const adminExportRoutes = require("./routes/adminExport");


const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

//photo code
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Routes
app.use("/auth", authRoutes);
app.use("/tasks", tasksRoutes);
app.use("/tasks", taskStatusRoutes);
app.use("/daily-logs", dailyLogsRoutes);
app.use("/admin", adminRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/supervisor", supervisorRoutes);
//app.use("/inventory-warnings", inventoryWarnings);
app.use("/observations", observationsRoutes);
app.use("/admin", adminCriticalRoutes);
app.use("/admin", adminEmailRoutes);
app.use("/admin", adminExportRoutes);

// Start server LAST
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});