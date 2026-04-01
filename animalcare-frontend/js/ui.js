import { $, setText } from "./dom.js";
import { state } from "./state.js";

export function setAlert(type, msg) {
  const box =
    $("alertBox3") ||
    $("alertBoxObs") ||
    $("usersAlert");

  if (!box) {
    alert(msg);
    return;
  }

  const icon =
    type === "success" ? "check-circle-fill" :
    type === "danger"  ? "exclamation-triangle-fill" :
    type === "warning" ? "exclamation-triangle-fill" :
                         "info-circle-fill";

  box.className = `alert alert-${type} d-flex align-items-center`;
  box.innerHTML = `<i class="bi bi-${icon} me-2"></i>${msg}`;
  box.classList.remove("d-none");

  clearTimeout(setAlert._timer);
  setAlert._timer = setTimeout(() => box.classList.add("d-none"), 4500);
}

export function badgeForStatus(status) {
  if (status === "CRITICAL") return "text-bg-danger";
  if (status === "WARN") return "text-bg-warning";
  if (status === "OK") return "text-bg-success";
  return "text-bg-secondary";
}

export function getRoleView() {
  const v = $("roleView3")?.value;
  if (v && v !== "auto") return v;

  const r = state.currentUser?.role;
  if (r === "ADMIN") return "admin";
  if (r === "SUPERVISOR") return "supervisor";
  return "caretaker";
}

export function updateRoleSpecificUI(view) {
  document.querySelectorAll(".admin-only,.supervisor-only,.caretaker-only").forEach(el => {
    el.classList.add("d-none");
  });

  document.querySelectorAll(`.${view}-only`).forEach(el => {
    el.classList.remove("d-none");
  });
}

export function setHeader(view) {
  const titles = {
    admin: {
      title: "Admin Dashboard",
      subtitle: "Overview, missed tasks, inventory warnings, and daily status."
    },
    supervisor: {
      title: "Supervisor Dashboard",
      subtitle: "Approve or reject pending logs."
    },
    caretaker: {
      title: "Caretaker Dashboard",
      subtitle: "Log daily tasks fast and clearly."
    }
  };

  const t = titles[view] || { title: "Dashboard", subtitle: "" };
  setText("pageTitle3", t.title);
  setText("pageSubtitle3", t.subtitle);
}

export function setRoleBadge() {
  const badge = $("userRoleBadge3");
  if (!badge) return;

  if (!state.currentUser) {
    badge.innerHTML = `<span class="badge bg-secondary">Not logged in</span>`;
    return;
  }

  const role = state.currentUser.role;
  const cls =
    role === "ADMIN" ? "danger" :
    role === "SUPERVISOR" ? "warning" :
    "info";

  badge.innerHTML = `<span class="badge bg-${cls}">${role}</span>`;
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

  // Backward compatibility for old dashboard pages
  document.querySelectorAll(".caretaker-only").forEach(el => {
    el.classList.toggle("d-none", !isWorker);
  });
}