// js/ui-roles.js
import { $, } from "./api.js";
import { state } from "./state.js";

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
  const adminOnly = document.querySelectorAll(".admin-only");
  const supervisorOnly = document.querySelectorAll(".supervisor-only");
  const caretakerOnly = document.querySelectorAll(".caretaker-only");

  adminOnly.forEach((el) => (el.style.display = view === "admin" ? "block" : "none"));
  supervisorOnly.forEach((el) => (el.style.display = view === "supervisor" ? "block" : "none"));
  caretakerOnly.forEach((el) => (el.style.display = view === "caretaker" ? "block" : "none"));

  const adminExtras = $("adminExtras");
  if (adminExtras) adminExtras.style.display = view === "admin" ? "flex" : "none";

  const adminInstructions = $("adminInstructionsCard");
  if (adminInstructions)
    adminInstructions.style.display = view === "caretaker" || view === "supervisor" ? "block" : "none";
}
