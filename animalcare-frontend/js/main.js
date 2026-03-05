import { isoToday, api } from "./api.js";
import { state } from "./state.js";
import { on, $ , setHTML } from "./dom.js";

import { wireAuthUI, loadMe, setOnLoginSuccess } from "./auth.js";
import { loadTasksToday } from "./caretaker.js";
import { loadAdminPanels, wireAdminActions } from "./admin.js";
import { loadSupervisorQueue } from "./supervisor.js";
import { loadObservations, createObservation } from "./observations.js";

import {
  getRoleView,
  updateRoleSpecificUI,
  setHeader,
  setRoleBadge,
  setAlert,
  applyRoleVisibility,
} from "./ui.js";

export async function refreshAll() {
  const date = $("globalDate3")?.value || isoToday();

  console.log("[main.js] refreshAll date =", date);

  // ensure we have current user
  state.currentUser = await api("/auth/me");

  // show correct role sections/buttons
  applyRoleVisibility();

  // Backend badge
  try {
    await api("/health");
    setHTML("kpiBackend3", `<span class="badge bg-success">Online</span>`);
  } catch {
    setHTML("kpiBackend3", `<span class="badge bg-danger">Offline</span>`);
  }

  // caretaker tasks always visible
  await loadTasksToday(date);

  // observations
  await loadObservations(date);

  // headers + chosen view
  const view = getRoleView();
  setHeader(view);
  updateRoleSpecificUI(view);
  setRoleBadge();

  // admin panels
  if (state.currentUser?.role === "ADMIN" || view === "admin") {
    await loadAdminPanels(date);
  }

  // supervisor queue (supervisor + admin)
  if (state.currentUser?.role === "SUPERVISOR" || state.currentUser?.role === "ADMIN" || view === "supervisor") {
    await loadSupervisorQueue(date);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if ($("globalDate3")) $("globalDate3").value = isoToday();

  setOnLoginSuccess(refreshAll);

  wireAuthUI();
  wireAdminActions();

  on("btnRefresh3", "click", async () => {
    try { await refreshAll(); } catch (e) { setAlert("danger", e.message); }
  });

  on("roleView3", "change", async () => {
    try { await refreshAll(); } catch (e) { setAlert("danger", e.message); }
  });

  on("globalDate3", "change", async () => {
    try { await refreshAll(); } catch (e) { setAlert("danger", e.message); }
  });

  on("btnObsCreate3", "click", async () => {
    try {
      const date = $("globalDate3")?.value || isoToday();
      await createObservation(date);
      await loadObservations(date);
      setAlert("success", "Observation added.");
    } catch (e) {
      setAlert("danger", e.message);
    }
  });

  await loadMe();
});