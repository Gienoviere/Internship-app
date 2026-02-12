import { isoToday, api } from "./api.js";
import { state } from "./state.js";
import { on, $, setHTML } from "./dom.js";
import { wireAuthUI, loadMe, setOnLoginSuccess } from "./auth.js";
import { loadTasksToday } from "./caretaker.js";
import { loadAdminPanels } from "./admin.js";
import { loadSupervisorQueue } from "./supervisor.js";
import { getRoleView, updateRoleSpecificUI, setHeader, setRoleBadge, setAlert } from "./ui.js";

export async function refreshAll() {
  const date = $("globalDate3")?.value || isoToday();

  // Backend badge
  try {
    await api("/health");
    setHTML("kpiBackend3", `<span class="badge bg-success">Online</span>`);
  } catch {
    setHTML("kpiBackend3", `<span class="badge bg-danger">Offline</span>`);
  }

  // Always: caretaker tasks
  await loadTasksToday(date);

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
  if ($("globalDate3")) $("globalDate3").value = isoToday();

  setOnLoginSuccess(refreshAll);

  wireAuthUI();

  on("btnRefresh3", "click", async () => {
    try { await refreshAll(); } catch (e) { setAlert("danger", e.message); }
  });
  on("roleView3", "change", async () => {
    try { await refreshAll(); } catch (e) { setAlert("danger", e.message); }
  });
  on("globalDate3", "change", async () => {
    try { await refreshAll(); } catch (e) { setAlert("danger", e.message); }
  });

  on("btnOpenDetails3", "click", () => {
    if (!window.bootstrap) return;
    const el = $("detailsModal3");
    if (!el) return;
    new bootstrap.Modal(el).show();
  });

  await loadMe();
});
