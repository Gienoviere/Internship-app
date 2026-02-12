import { state, getToken, clearToken } from "./state.js";

export async function api(path, options = {}) {
  const headers = options.headers || {};

  const t = getToken();
  if (t) headers["Authorization"] = `Bearer ${t}`;
  if (options.json) headers["Content-Type"] = "application/json";

  const res = await fetch(`${state.apiBase}${path}`, {
    ...options,
    headers,
    body: options.json ? JSON.stringify(options.json) : options.body,
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      throw new Error("Unauthorized (login again)");
    }
    throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  }
  return data;
}

export function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
