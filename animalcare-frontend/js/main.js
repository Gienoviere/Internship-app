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

const dateEl = $("globalDate3");
const date = (dateEl && dateEl.value) ? dateEl.value : isoToday();
if (dateEl && !dateEl.value) dateEl.value = date;

export async function refreshAll() {
  console.log("[main.js] refreshAll called");

  const date = $("globalDate3")?.value || isoToday();

  state.currentUser = await api("/auth/me");
  applyRoleVisibility();

  // Backend badge
  try {
    await api("/health");
    setHTML("kpiBackend3", `<span class="badge bg-success">Online</span>`);
  } catch {
    setHTML("kpiBackend3", `<span class="badge bg-danger">Offline</span>`);
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
    
    if (!date) date = isoToday();
  }

  await loadSupervisorQueue(date);
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
  } catch (e) {
    setAlert("danger", e.message);
  }
});


  await loadMe();
});

export function getSelectedDate() {
  // 1) URL override (useful for supervisors/admins and reproducible)
  const urlDate = new URLSearchParams(window.location.search).get("date");
  if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) return urlDate;

  // 2) Date input (if present)
  const el = document.getElementById("globalDate3");
  if (el && el.value) return el.value;

  // 3) Fallback: today
  return new Date().toISOString().slice(0, 10);
}
