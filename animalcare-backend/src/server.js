const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./cron/inventoryWarningsCron"); 

const authRoutes = require("./routes/auth");
const tasksRoutes = require("./routes/tasks");
const taskStatusRoutes = require("./routes/taskStatus");
const dailyLogsRoutes = require("./routes/dailyLogs");
const adminRoutes = require("./routes/admin");
//const inventoryRoutes = require("./routes/inventory");
const supervisorRoutes = require("./routes/supervisor");
//const inventoryWarnings = ("./admin/inventory-warnings");
const observationsRoutes = require("./routes/observations");
const adminCriticalRoutes = require("./routes/adminCritical");
const adminEmailRoutes = require("./routes/adminEmail");
const adminExportRoutes = require("./routes/adminExport");
const dashboardRoutes = require("./routes/dashboard");
const userRoutes = require("./routes/users");
const taskAssignmentRoutes = require("./routes/taskAssignments");
const googleCalendarRoutes = require("./routes/googleCalendar");
const manualRoutes = require("./routes/manual");


const app = express();
app.use(cors({
   origin: [
    "http://192.168.20.40:3001",
    "http://127.0.0.1:3000",
    "http://192.168.20.40:3000",
    "http://192.168.20.40:8080"
  ],
}));
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
//app.use("/inventory", inventoryRoutes);
app.use("/supervisor", supervisorRoutes);
//app.use("/inventory-warnings", inventoryWarnings);
app.use("/observations", observationsRoutes);
app.use("/admin", adminCriticalRoutes);
app.use("/admin", adminEmailRoutes);
app.use("/admin", adminExportRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/api", userRoutes)
app.use("/users", userRoutes);
app.use("/task-assignments", taskAssignmentRoutes);
app.use("/google-calendar", googleCalendarRoutes);
app.use('/manual', manualRoutes);


// Start server LAST
const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
