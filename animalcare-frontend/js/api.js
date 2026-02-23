import { getToken, clearToken } from "./state.js";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001").replace(/\/$/, "");

if (location.hostname !== "localhost" && API_BASE_URL.includes("localhost")) {
  console.warn(
    `[API] Frontend is running on ${location.origin} but API base is ${API_BASE_URL}. ` +
    `This will fail on other machines. Use the LAN env/script.`
  );
}

export async function api(path, options = {}) {
  const headers = options.headers || {};

  const t = getToken();
  if (t) headers["Authorization"] = `Bearer ${t}`;
  if (options.json) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE_URL}${path}`, {
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