import { state } from "./state.js";

export function setAlert(type, msg) {
  const box =
    document.getElementById("alertBox3") ||
    document.getElementById("alertBoxObs") ||
    document.getElementById("usersAlert");

  if (!box) {
    alert(msg);
    return;
  }

  box.className = `alert alert-${type}`;
  box.textContent = msg;
  box.classList.remove("d-none");

  clearTimeout(setAlert._timer);
  setAlert._timer = setTimeout(() => {
    box.classList.add("d-none");
  }, 4000);
}

export function applyRoleVisibility() {
  const role = String(state.currentUser?.role || "").toUpperCase();
  const isAdmin = role === "ADMIN";
  const isSupervisor = role === "SUPERVISOR";
  const isManager = isAdmin || isSupervisor;
  const isWorker = role === "FARMER" || role === "VOLUNTEER";

  document.querySelectorAll(".admin-only").forEach(el => {
    el.classList.toggle("d-none", !isAdmin);
  });

  document.querySelectorAll(".supervisor-only").forEach(el => {
    el.classList.toggle("d-none", !isSupervisor);
  });

  document.querySelectorAll(".manager-only").forEach(el => {
    el.classList.toggle("d-none", !isManager);
  });

  document.querySelectorAll(".worker-only").forEach(el => {
    el.classList.toggle("d-none", !isWorker);
  });
}