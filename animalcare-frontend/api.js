// js/api.js
export const API_BASE = "http://localhost:3001";

export function $(id) {
  return document.getElementById(id);
}

export function token() {
  return localStorage.getItem("token");
}

export function setAlert(type, msg) {
  const box = $("alertBox3");
  if (!box) return;

  box.className = `alert alert-${type} d-flex align-items-center`;
  box.innerHTML = `<i class="bi bi-${
    type === "success"
      ? "check-circle-fill"
      : type === "danger"
      ? "exclamation-triangle-fill"
      : "info-circle-fill"
  } me-2"></i>${msg}`;

  box.classList.remove("d-none");
  setTimeout(() => box.classList.add("d-none"), 4500);
}

export async function api(path, options = {}) {
  const headers = options.headers || {};
  if (token()) headers["Authorization"] = `Bearer ${token()}`;
  if (options.json) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.json ? JSON.stringify(options.json) : options.body,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  return data;
}

export function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
