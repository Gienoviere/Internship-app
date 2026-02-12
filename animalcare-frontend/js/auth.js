import { api } from "./api.js";
import { state, setToken, clearToken, getToken } from "./state.js";
import { show, hide, on, $ } from "./dom.js";
import { setAlert } from "./ui.js";

let onLoginSuccess = null;

// main.js will inject refreshAll into here (avoids circular import)
export function setOnLoginSuccess(fn) {
  onLoginSuccess = fn;
}

export async function loadMe() {
  if (!getToken()) {
    state.currentUser = null;
    show("viewLogin3");
    hide("viewApp3");
    hide("btnLogout3");
    return;
  }

  try {
    state.currentUser = await api("/auth/me");
    hide("viewLogin3");
    show("viewApp3");
    show("btnLogout3");

    if (typeof onLoginSuccess === "function") {
      await onLoginSuccess();
    }
  } catch (e) {
    console.error(e);
    clearToken();
    state.currentUser = null;
    show("viewLogin3");
    hide("viewApp3");
    hide("btnLogout3");
    setAlert("danger", e.message);
  }
}

export function wireAuthUI() {
  on("loginForm3", "submit", async (e) => {
    e.preventDefault();

    const email = $("loginEmail3")?.value?.trim();
    const password = $("loginPassword3")?.value;

    if (!email || !password) return setAlert("danger", "Email and password required");

    try {
      const res = await api("/auth/login", { method: "POST", json: { email, password } });
      setToken(res.token);
      setAlert("success", "Logged in.");
      await loadMe();
    } catch (err) {
      setAlert("danger", err.message);
    }
  });

  on("btnDemoFill3", "click", () => {
    if ($("loginEmail3")) $("loginEmail3").value = "admin@test.com";
    if ($("loginPassword3")) $("loginPassword3").value = "test1234";
  });

  on("btnLogout3", "click", () => {
    clearToken();
    state.currentUser = null;
    setAlert("info", "Logged out.");
    loadMe();
  });
}

