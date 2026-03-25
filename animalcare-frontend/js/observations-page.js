import { isoToday, api } from "./api.js";
import { state } from "./state.js";
import {
  loadObservations,
  createObservation,
  updateObservation,
  wireObservationPhotoPreview,
  loadTaskOptions,
} from "./observations.js";

function $(id) {
  return document.getElementById(id);
}

function setAlert(type, msg) {
  const box = $("alertBoxObs");
  if (!box) return;
  box.className = `alert alert-${type}`;
  box.textContent = msg;
  box.classList.remove("d-none");
  setTimeout(() => box.classList.add("d-none"), 4000);
}

function setRoleBadge() {
  const badge = $("userRoleBadgeObs");
  if (!badge) return;
  badge.textContent = state.currentUser?.role || "Not logged in";
}

async function refreshObservationsPage() {
  const date = $("globalDateObs")?.value || isoToday();
  const me = await api("/auth/me");
  state.currentUser = me.user || me;
  setRoleBadge();
  await loadTaskOptions();
  await loadObservations(date);
}

document.addEventListener("DOMContentLoaded", async () => {
  if ($("globalDateObs")) {
    $("globalDateObs").value = isoToday();
  }

  wireObservationPhotoPreview();

  $("btnRefreshObs")?.addEventListener("click", async () => {
    try {
      await refreshObservationsPage();
    } catch (e) {
      setAlert("danger", e.message || "Refresh failed");
    }
  });

  $("globalDateObs")?.addEventListener("change", async () => {
    try {
      await refreshObservationsPage();
    } catch (e) {
      setAlert("danger", e.message || "Date change failed");
    }
  });

  $("btnObsCreate3")?.addEventListener("click", async () => {
    try {
      const date = $("globalDateObs")?.value || isoToday();
      await createObservation(date);
      await loadObservations(date);
      setAlert("success", "Observation added.");
    } catch (e) {
      setAlert("danger", e.message || "Observation failed");
    }
  });

  $("btnUpdateObs3")?.addEventListener("click", async () => {
    try {
      const date = $("globalDateObs")?.value || isoToday();
      await updateObservation(date);
    } catch (e) {
      setAlert("danger", e.message || "Could not update observation");
    }
  });

  $("btnLogout3")?.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "/index.html";
  });

  try {
    await refreshObservationsPage();
  } catch (e) {
    setAlert("danger", e.message || "Failed to load observations.");
  }
});