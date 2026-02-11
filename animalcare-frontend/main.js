// js/main.js
import { $, api, isoToday, setAlert } from "./api.js";
import { loadMe, refreshAll } from "./dashboard-core.js";
import { injectMissingUI } from "./ui-inject.js";
import { applyBootstrapLayout } from "./layout.js";

document.addEventListener("DOMContentLoaded", async () => {
  $("globalDate3").value = isoToday();

  // Styling classes voor login
  $("loginEmail3")?.classList.add("form-control");
  $("loginPassword3")?.classList.add("form-control");
  $("btnDemoFill3")?.classList.add("btn", "btn-sm", "btn-outline-secondary");
  $("loginForm3")?.querySelector("button[type=submit]")?.classList.add("btn", "btn-primary");

  // LOGIN
  $("loginForm3").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const email = $("loginEmail3").value.trim();
      const password = $("loginPassword3").value;

      const res = await api("/auth/login", { method: "POST", json: { email, password } });
      localStorage.setItem("token", res.token);

      setAlert("success", "Logged in.");
      await loadMe();
    } catch (err) {
      setAlert("danger", err.message);
    }
  });

  $("btnDemoFill3").addEventListener("click", () => {
    $("loginEmail3").value = "admin@example.com";
    $("loginPassword3").value = "password";
  });

  $("btnLogout3").addEventListener("click", () => {
    localStorage.removeItem("token");
    setAlert("info", "Logged out.");
    loadMe();
  });

  $("btnRefresh3").addEventListener("click", refreshAll);
  $("roleView3").addEventListener("change", refreshAll);
  $("globalDate3").addEventListener("change", refreshAll);

  $("btnOpenDetails3").addEventListener("click", () => {
    const modal = new bootstrap.Modal(document.getElementById("detailsModal3"));
    modal.show();
  });

  injectMissingUI();
  applyBootstrapLayout();
  await loadMe();
});
