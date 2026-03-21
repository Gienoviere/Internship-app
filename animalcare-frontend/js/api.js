import { getToken, clearToken } from "./state.js";

// const API_BASE_URL = (
//   (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL)
//   || "https://internship-app-4iud.onrender.com"
// ).replace(/\/$/, "");

const API_BASE_URL = (
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL)
  || "http://localhost:3001"
).replace(/\/$/, "");

try {
  const apiHost = new URL(API_BASE_URL).hostname;
  const pageHost = location.hostname;

  // If API points to localhost but page is on localhost too, it might still be wrong (team LAN backend case).
  // So warn if API is localhost AND the user isn't running the backend locally.
  if (apiHost === "localhost" && pageHost === "localhost") {
    console.warn(`[API] API is set to localhost. If you're using a shared backend, run npm run dev:lan`);
  }
} catch {}

console.log("API_BASE_URL =", API_BASE_URL);

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

export function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}