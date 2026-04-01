import { isoToday, api } from "./api.js";
import { state } from "./state.js";
import { on, $, setHTML } from "./dom.js";
import { wireAuthUI, loadMe, setOnLoginSuccess } from "./auth.js";
import { loadTasksToday } from "./caretaker.js";
import { loadAdminPanels, wireAdminActions } from "./admin.js";
import { loadSupervisorQueue } from "./supervisor.js";
import {
  getRoleView,
  updateRoleSpecificUI,
  setHeader,
  setRoleBadge,
  setAlert,
  applyRoleVisibility,
} from "./ui.js";
import { wireQuickLogShared } from "./quick-log.js";


export async function refreshAll() {
  const date = $("globalDate3")?.value || isoToday();

  console.log("[main.js] refreshAll date =", date);

  // Sync current user from backend so role-based UI always uses real data
  const me = await api("/auth/me");
  state.currentUser = me.user || me;
  const currentUser = state.currentUser;

  // Show/hide role sections first
  applyRoleVisibility();

  // Backend status badge
  try {
    await api("/health");
    setHTML("kpiBackend3", `<span class="badge bg-success">Online</span>`);
  } catch {
    setHTML("kpiBackend3", `<span class="badge bg-danger">Offline</span>`);
  }

  const badge = document.getElementById("userRoleBadge3");
  if (badge) {
    badge.textContent = currentUser?.role || "Unknown role";
  }

  // Caretaker/common panels
  await loadTasksToday(date);
  //await loadObservations(date);
  await loadCriticalObservationKpi();
  //await loadQuickLogTasks(date);
  await loadDashboardSummary(date);

  // Titles + role/view-specific UI
  const view = getRoleView();
  setHeader(view);
  updateRoleSpecificUI(view);
  setRoleBadge();

  // Admin panels
  if (currentUser?.role === "ADMIN" || view === "admin") {
  await loadAdminPanels(date);
}

if (
  currentUser?.role === "SUPERVISOR" ||
  currentUser?.role === "ADMIN" ||
  view === "supervisor"
) {
  await loadSupervisorQueue(date);
}
}

document.addEventListener("DOMContentLoaded", async () => {
  // Default date
  if ($("globalDate3")) {
    $("globalDate3").value = isoToday();
  }

  // Let auth.js call refreshAll after successful login
  setOnLoginSuccess(refreshAll);

  // Wire UI
  wireAuthUI();
  wireAdminActions();
  wireDashboardCsv();
  wireQuickLogShared(refreshAll);

  on("btnRefresh3", "click", async () => {
    try {
      await refreshAll();
    } catch (e) {
      setAlert("danger", e.message || "Refresh failed");
    }
  });

  on("roleView3", "change", async () => {
    try {
      await refreshAll();
    } catch (e) {
      setAlert("danger", e.message || "Role switch failed");
    }
  });

  on("globalDate3", "change", async () => {
    try {
      await refreshAll();
    } catch (e) {
      setAlert("danger", e.message || "Date change failed");
    }
  });

  on("btnOpenDetails3", "click", () => {
    if (!window.bootstrap) return;
    const el = $("detailsModal3");
    if (!el) return;
    new bootstrap.Modal(el).show();
  });

  // on("btnObsCreate3", "click", async () => {
  //   try {
  //     const date = $("globalDate3")?.value || isoToday();
  //     await createObservation(date);
  //     await loadObservations(date);
  //     setAlert("success", "Observation added.");
  //   } catch (e) {
  //     setAlert("danger", e.message || "Observation failed");
  //   }
  // });

  // Initial auth check + app load
  try {
    await loadMe();
  } catch (e) {
    console.error("Initial loadMe failed:", e);
  }

  //Email
  document.getElementById("btnSendSummary")?.addEventListener("click", () => {
  openSendSummaryModal();
  });

  document.getElementById("btnSendSummarySubmit")?.addEventListener("click", async () => {
    try {
      await sendSummaryEmail();
    } catch (e) {
      setAlert("danger", e.message || "Failed to send summary email.");
    }
  });
});

// Summary of the dashboard
function statusBadge(status) {
  if (status === "Completed") return `<span class="badge bg-success">Completed</span>`;
  if (status === "Logged") return `<span class="badge bg-warning text-dark">Logged</span>`;
  return `<span class="badge bg-danger">Not done</span>`;
}

async function loadDashboardSummary(date) {
  const data = await api(`/dashboard/summary?date=${date}`);

  const totals = data.totals || {};
  const overview = data.overview || [];
  const recentActivity = data.recentActivity || [];

  // top KPIs
  if ($("kpiCompleted3")) $("kpiCompleted3").textContent = `${totals.completionPercent ?? 0}%`;
  if ($("kpiTasks3")) $("kpiTasks3").textContent = String(totals.totalTasks ?? 0);
  if ($("kpiMissed3")) $("kpiMissed3").textContent = String((totals.totalTasks ?? 0) - (totals.completedCount ?? 0));
  if ($("kpiAlerts3")) $("kpiAlerts3").textContent = String(totals.warnings ?? 0);
  if ($("supPendingCount3")) $("supPendingCount3").textContent = String(totals.pendingApprovals ?? 0);

  // admin cards
  if ($("adminActiveUsers")) $("adminActiveUsers").textContent = String(totals.activeUsers ?? 0);
  if ($("adminTasksCompleted")) $("adminTasksCompleted").textContent = `${totals.completionPercent ?? 0}%`;
  if ($("adminWarnings")) $("adminWarnings").textContent = String(totals.warnings ?? 0);

  // stats bars
  if ($("statTaskCompletionBar3")) {
    $("statTaskCompletionBar3").style.width = `${totals.completionPercent ?? 0}%`;
    $("statTaskCompletionBar3").textContent = `${totals.completionPercent ?? 0}%`;
  }

  if ($("statInventoryWarningsBar3")) {
    const warningCount = totals.warnings ?? 0;
    const warningWidth = Math.min(warningCount * 10, 100);
    $("statInventoryWarningsBar3").style.width = `${warningWidth}%`;
    $("statInventoryWarningsBar3").textContent = `${warningCount} item${warningCount === 1 ? "" : "s"}`;
  }

  // overview table
  if ($("overviewTable3")) {
    $("overviewTable3").innerHTML = overview.map((row) => `
      <tr>
        <td>${row.taskName}</td>
        <td>${statusBadge(row.status)}</td>
        <td>${
          row.assignedUsers?.length
            ? row.assignedUsers.join(", ")
            : "—"
        }</td>
      </tr>
    `).join("");
  }

  // admin overview table
 if ($("adminOverviewTable")) {
  $("adminOverviewTable").innerHTML = overview.map((row) => `
    <tr>
      <td>${row.taskName}</td>
      <td>${row.assignedUsers?.length ? row.assignedUsers.join(", ") : "—"}</td>
      <td>${statusBadge(row.status)}</td>
      <td><button class="btn btn-sm btn-outline-secondary" disabled>View</button></td>
    </tr>
  `).join("");
}

  // recent activity
  if ($("recentActivityTable3")) {
    $("recentActivityTable3").innerHTML = recentActivity.length
      ? recentActivity.map((item) => `
          <tr>
            <td>${item.time}</td>
            <td><span class="badge bg-success">${item.action}</span></td>
            <td>${item.by}</td>
            <td>${item.details}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="4" class="text-muted">No activity for this date.</td></tr>`;
  }
}

//CsV button code
function wireDashboardCsv() {
  const clickHandler = () => {
    const date = $("globalDate3")?.value || isoToday();
    window.location.href = `/dashboard/export.csv?date=${encodeURIComponent(date)}`;
  };

  $("btnDownloadCsv3")?.addEventListener("click", clickHandler);
  $("btnDownloadCsv")?.addEventListener("click", clickHandler);
}

//code for the email
function openSendSummaryModal() {
  const modalEl = document.getElementById("sendSummaryModal");
  if (!modalEl || !window.bootstrap) return;
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

async function sendSummaryEmail() {
  const recipientsRaw = document.getElementById("summaryRecipients3")?.value?.trim() || "";
  const period = document.getElementById("summaryPeriod3")?.value || "selected";
  const autoSend = Boolean(document.getElementById("summaryAutoSend3")?.checked);

  if (!recipientsRaw) {
    setAlert("danger", "Please enter at least one recipient.");
    return;
  }

  const recipients = recipientsRaw
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);

  if (!recipients.length) {
    setAlert("danger", "Please enter valid recipient emails.");
    return;
  }

  const selectedDate = $("globalDate3")?.value || isoToday();
  const date = period === "today" ? isoToday() : selectedDate;

  await api("/dashboard/send-summary", {
    method: "POST",
    json: {
      date,
      recipients,
      autoSend
    }
  });

  const modalEl = document.getElementById("sendSummaryModal");
  if (modalEl && window.bootstrap) {
    bootstrap.Modal.getOrCreateInstance(modalEl).hide();
  }

  setAlert("success", "Summary email sent.");
}

async function loadCriticalObservationKpi() {
  const countEl = document.getElementById("criticalObsCount3");
  const listEl = document.getElementById("criticalObsList3");

  try {
    const payload = await api("/observations/critical-count");

    if (countEl) countEl.textContent = payload.count ?? 0;

    if (listEl) {
      listEl.innerHTML = (payload.latest || []).length
        ? payload.latest.map(obs => `
            <li class="list-group-item d-flex justify-content-between align-items-start">
              <div>
                <div class="fw-semibold">${obs.title}</div>
                <div class="small text-muted">${obs.animalTag || "—"}</div>
              </div>
              <span class="badge bg-danger">${obs.severity}</span>
            </li>
          `).join("")
        : `<li class="list-group-item text-muted">No critical observations.</li>`;
    }
  } catch (err) {
    console.error("Failed to load critical observation KPI:", err);
    if (countEl) countEl.textContent = "0";
    if (listEl) {
      listEl.innerHTML = `<li class="list-group-item text-muted">Critical observation KPI unavailable.</li>`;
    }
  }
}
