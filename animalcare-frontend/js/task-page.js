import { isoToday, api } from "./api.js";
import { state } from "./state.js";
import { $, on } from "./dom.js";
import { loadTasksToday } from "./caretaker.js";
import { loadSupervisorQueue } from "./supervisor.js";
import { setAlert, applyRoleVisibility, setRoleBadge } from "./ui.js";

async function refreshTasksPage() {
  const date = $("globalDate3")?.value || isoToday();

  state.currentUser = await api("/auth/me");
  applyRoleVisibility();
  setRoleBadge();

  await loadTasksToday(date);

  if (
    state.currentUser?.role === "SUPERVISOR" ||
    state.currentUser?.role === "ADMIN"
  ) {
    await loadSupervisorQueue(date);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if ($("globalDate3")) $("globalDate3").value = isoToday();

  on("btnRefresh3", "click", async () => {
    try {
      await refreshTasksPage();
    } catch (e) {
      setAlert("danger", e.message);
    }
  });

  on("globalDate3", "change", async () => {
    try {
      await refreshTasksPage();
    } catch (e) {
      setAlert("danger", e.message);
    }
  });

  try {
    await refreshTasksPage();
  } catch (e) {
    setAlert("danger", e.message);
  }
});