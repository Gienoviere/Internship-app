import { isoToday, api } from "./api.js";
import { state } from "./state.js";
import { on, $, setHTML } from "./dom.js";
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
  await loadObservations(date);

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

  on("btnObsCreate3", "click", async () => {
    try {
      const date = $("globalDate3")?.value || isoToday();
      await createObservation(date);
      await loadObservations(date);
      setAlert("success", "Observation added.");
    } catch (e) {
      setAlert("danger", e.message || "Observation failed");
    }
  });

  // Initial auth check + app load
  try {
    await loadMe();
  } catch (e) {
    console.error("Initial loadMe failed:", e);
  }
});
