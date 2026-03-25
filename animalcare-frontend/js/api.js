export const API_BASE_URL = (
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL)
  || "http://192.168.20.40:3001"
).replace(/\/$/, "");

export function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

export async function api(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const token = localStorage.getItem("token");

  const headers = {
    ...(options.json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.json ? JSON.stringify(options.json) : options.body,
  });

  if (!res.ok) {
    let message = "Request failed";
    try {
      const data = await res.json();
      message = data.error || data.message || message;
    } catch {
      try {
        message = await res.text();
      } catch {}
    }
    throw new Error(message);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.text();
}