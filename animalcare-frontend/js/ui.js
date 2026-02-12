import { $, setHTML, setText } from "./dom.js";
import { state } from "./state.js";

export function setAlert(type, msg) {
  const box = $("alertBox3");
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
  const v = $("roleView3")?.value;
  if (v && v !== "auto") return v;

  const r = state.currentUser?.role;
  if (r === "ADMIN") return "admin";
  if (r === "SUPERVISOR") return "supervisor";
  return "caretaker";
}

export function updateRoleSpecificUI(view) {
  document.querySelectorAll(".admin-only").forEach(el => el.style.display = view === "admin" ? "" : "none");
  document.querySelectorAll(".supervisor-only").forEach(el => el.style.display = view === "supervisor" ? "" : "none");
  document.querySelectorAll(".caretaker-only").forEach(el => el.style.display = view === "caretaker" ? "" : "none");

  const adminExtras = $("adminExtras");
  if (adminExtras) adminExtras.style.display = view === "admin" ? "" : "none";

  const adminSpecificUI = $("adminSpecificUI");
  if (adminSpecificUI) adminSpecificUI.classList.toggle("d-none", view !== "admin");
}

export function setHeader(view) {
  const titles = {
    admin: { title: "Admin Dashboard", subtitle: "Overzicht, gemiste taken, voorraadwaarschuwingen en dagelijkse status." },
    supervisor: { title: "Supervisor Dashboard", subtitle: "Keur aanvragen goed of keur ze af." },
    caretaker: { title: "Caretaker Dashboard", subtitle: "Log dagelijkse taken snel en accuraat." }
  };

  const t = titles[view] || { title: "Dashboard", subtitle: "Backend-gekoppelde mockup." };
  setText("pageTitle3", t.title);
  setText("pageSubtitle3", t.subtitle);
}

export function setRoleBadge() {
  const badge = $("roleBadge3");
  if (!badge) return;

  if (!state.currentUser) {
    badge.innerHTML = `<span class="badge bg-secondary">Not logged in</span>`;
    return;
  }

  const role = state.currentUser.role;
  const cls = role === "ADMIN" ? "danger" : role === "SUPERVISOR" ? "warning" : "info";
  badge.innerHTML = `<span class="badge bg-${cls}">${role}</span>`;
}
