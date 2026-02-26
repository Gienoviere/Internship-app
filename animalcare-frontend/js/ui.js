import { $, setHTML, setText, show, hide, } from "./dom.js";
import { state } from "./state.js";

export function setAlert(type, msg) {
  const box = $("alertBox");
  if (!box) return alert(msg);

  const icon =
    type === "success" ? "check-circle-fill" :
    type === "danger"  ? "exclamation-triangle-fill" :
                         "info-circle-fill";

  box.className = `alert alert-${type} d-flex align-items-center`;
  box.innerHTML = `<i class="bi bi-${icon} me-2"></i>${msg}`;
  box.classList.remove("d-none");
  setTimeout(() => box.classList.add("d-none"), 4500);
}

export function badgeForStatus(status) {
  if (status === "CRITICAL") return "text-bg-danger";
  if (status === "WARN") return "text-bg-warning";
  if (status === "OK") return "text-bg-success";
  return "text-bg-secondary";
}

export function getRoleView() {
  const v = $("roleView")?.value;
  if (v && v !== "auto") return v;

  const r = state.currentUser?.role;
  if (r === "ADMIN") return "admin";
  if (r === "SUPERVISOR") return "supervisor";
  return "caretaker";
}

export function updateRoleSpecificUI(view) {
  // First hide all role-only blocks
  document.querySelectorAll(".admin-only,.supervisor-only,.caretaker-only").forEach(el => {
    el.classList.add("d-none");
  });

  // Then show only the chosen view
  document.querySelectorAll(`.${view}-only`).forEach(el => {
    el.classList.remove("d-none");
  });

  const adminExtras = $("adminExtras");
  if (adminExtras) adminExtras.classList.toggle("d-none", view !== "admin");

  const adminSpecificUI = $("adminSpecificUI");
  if (adminSpecificUI) adminSpecificUI.classList.toggle("d-none", view !== "admin");
}

export function setHeader(view) {
  const titles = {
    admin: { title: "Admin Dashboard", subtitle: "Overzicht, gemiste taken, voorraadwaarschuwingen en dagelijkse status." },
    supervisor: { title: "Supervisor Dashboard", subtitle: "Keur aanvragen goed of keur ze af." },
    caretaker: { title: "Caretaker Dashboard", subtitle: "Log dagelijkse taken snel en accuraat." }
  };

  const t = titles[view] || { title: "Dashboard" };
  setText("pageTitle", t.title);
  setText("pageSubtitle", t.subtitle);
}

export function setRoleBadge() {
  const badge = $("roleBadge");
  if (!badge) return;

  if (!state.currentUser) {
    badge.innerHTML = `<span class="badge bg-secondary">Not logged in</span>`;
    return;
  }

  const role = state.currentUser.role;
  const cls = role === "ADMIN" ? "danger" : role === "SUPERVISOR" ? "warning" : "info";
  badge.innerHTML = `<span class="badge bg-${cls}">${role}</span>`;
}

export function applyRoleVisibility() {
  const role = state.currentUser?.role;

  // Hide everything first
  document.querySelectorAll(".admin-only,.supervisor-only,.caretaker-only")
    .forEach(el => el.classList.add("d-none"));

  if (!role) return;

  if (role === "ADMIN") {
    document.querySelectorAll(".admin-only,.supervisor-only,.caretaker-only")
      .forEach(el => el.classList.remove("d-none"));
  }
  else if (role === "SUPERVISOR") {
    document.querySelectorAll(".supervisor-only,.caretaker-only")
      .forEach(el => el.classList.remove("d-none"));
  }
  else {
    document.querySelectorAll(".caretaker-only")
      .forEach(el => el.classList.remove("d-none"));
  }

  // Sections
  const adminSection = $("adminSection3");
  const supervisorSection = $("supervisorSection3");
  const caretakerSection = $("caretakerSection3");

  // Buttons (optional but good for PvB)
  toggle("btnSendSummary", role === "ADMIN");
  toggle("btnDownloadCsv", role === "ADMIN");
  toggle("btnApprove", role === "SUPERVISOR" || role === "ADMIN");

  // Hide everything first
  hide("adminSection3");
  hide("supervisorSection3");
  hide("caretakerSection3");
  hide("btnSendSummary");
  hide("btnDownloadCsv");

  if (!role) return;

  // Caretaker
  if (role === "USER") {
    show("caretakerSection3");
  }

  // Supervisor
  if (role === "SUPERVISOR") {
    show("supervisorSection3");
  }

  // Admin (sees everything)
  if (role === "ADMIN") {
    show("adminSection3");
    show("supervisorSection3");
    show("caretakerSection3");
    show("btnSendSummary");
    show("btnDownloadCsv");
  }
}

function toggle(id, visible) {
  const el = $(id);
  if (!el) return;
  visible ? el.classList.remove("d-none") : el.classList.add("d-none");
}
