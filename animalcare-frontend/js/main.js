import { isoToday, api } from "./api.js";
import { state } from "./state.js";
import { on, $, setHTML } from "./dom.js";
import { wireAuthUI, loadMe, setOnLoginSuccess } from "./auth.js";
import { loadTasksToday } from "./caretaker.js";
import { loadAdminPanels } from "./admin.js";
import { loadSupervisorQueue } from "./supervisor.js";
import { getRoleView, updateRoleSpecificUI, setHeader, setRoleBadge, setAlert, applyRoleVisibility } from "./ui.js";
import { loadObservations, createObservation } from "./observations.js";
import { wireAdminActions } from "./admin.js";


export async function refreshAll() {
  const date = $("globalDate")?.value || isoToday();
  applyRoleVisibility();

  // Backend badge
  try {
    await api("/health");
    setHTML("kpiBackend", `<span class="badge bg-success">Online</span>`);
  } catch {
    setHTML("kpiBackend", `<span class="badge bg-danger">Offline</span>`);
  }

  // Always: caretaker tasks
  await loadTasksToday(date);

  // Photo sections
  await loadObservations(date);


  // View selection based on role
  const view = getRoleView();
  setHeader(view);
  updateRoleSpecificUI(view);
  setRoleBadge();

  // Admin panels
  if (view === "admin" || state.currentUser?.role === "ADMIN") {
    await loadAdminPanels(date);
  }

  // Supervisor queue
  if (
    view === "supervisor" ||
    state.currentUser?.role === "SUPERVISOR" ||
    state.currentUser?.role === "ADMIN"
  ) {
    await loadSupervisorQueue(date);
  }

  
  
}

document.addEventListener("DOMContentLoaded", async () => {
  if ($("globalDate")) $("globalDate").value = isoToday();

  setOnLoginSuccess(refreshAll);

  wireAuthUI();
  wireAdminActions();

  on("btnRefresh", "click", async () => {
    try { await refreshAll(); } catch (e) { setAlert("danger", e.message); }
  });
  on("roleView", "change", async () => {
    try { await refreshAll(); } catch (e) { setAlert("danger", e.message); }
  });
  on("globalDate", "change", async () => {
    try { await refreshAll(); } catch (e) { setAlert("danger", e.message); }
  });

  on("btnOpenDetails", "click", () => {
    if (!window.bootstrap) return;
    const el = $("detailsModal");
    if (!el) return;
    new bootstrap.Modal(el).show();
  });

  on("btnObsCreate", "click", async () => {
  try {
    const date = $("globalDate")?.value || isoToday();
    await createObservation(date);
    await loadObservations(date);
  } catch (e) {
    setAlert("danger", e.message);
  }
});


  await loadMe();
});
