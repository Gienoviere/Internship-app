// === CONFIG ===
const API_BASE = "http://localhost:3001";

// === HELPERS ===
function $(id) { return document.getElementById(id); }

function setAlert(type, msg) {
  const box = $("alertBox");
  box.className = `alert alert-${type}`;
  box.textContent = msg;
  box.classList.remove("d-none");
  setTimeout(() => box.classList.add("d-none"), 5000);
}

function token() {
  return localStorage.getItem("token");
}

async function api(path, options = {}) {
  const headers = options.headers || {};
  if (token()) headers["Authorization"] = `Bearer ${token()}`;
  if (options.json) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.json ? JSON.stringify(options.json) : options.body
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const errMsg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(errMsg);
  }
  return data;
}

function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// === AUTH ===
let currentUser = null;

async function loadMe() {
  try {
    const me = await api("/auth/me");
    currentUser = me;
    $("roleBadge").textContent = `${me.role} (${me.email || me.name || "user"})`;
    $("btnLogout").classList.remove("d-none");
    showApp();
  } catch {
    currentUser = null;
    $("roleBadge").textContent = "Not logged in";
    $("btnLogout").classList.add("d-none");
    showLogin();
  }
}

function showLogin() {
  $("viewLogin").classList.remove("d-none");
  $("viewApp").classList.add("d-none");
}

function showApp() {
  $("viewLogin").classList.add("d-none");
  $("viewApp").classList.remove("d-none");

  // Tabs visible depending on role
  const role = currentUser?.role;
  // Caretaker tab always visible after login
  // Admin tab only for ADMIN
  document.querySelector('[data-view="admin"]').parentElement.classList.toggle("d-none", role !== "ADMIN");
  // Supervisor tab for SUPERVISOR or ADMIN
  document.querySelector('[data-view="supervisor"]').parentElement.classList.toggle("d-none", !(role === "SUPERVISOR" || role === "ADMIN"));

  // Default landing
  if (role === "ADMIN") switchView("admin");
  else if (role === "SUPERVISOR") switchView("supervisor");
  else switchView("caretaker");
}

// === NAV ===
function switchView(view) {
  // tab active state
  document.querySelectorAll("#tabs .nav-link").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  $("paneCaretaker").classList.toggle("d-none", view !== "caretaker");
  $("paneAdmin").classList.toggle("d-none", view !== "admin");
  $("paneSupervisor").classList.toggle("d-none", view !== "supervisor");

  // Auto-load on switch
  if (view === "caretaker") loadCaretakerToday();
  if (view === "admin") loadAdmin();
  if (view === "supervisor") loadSupervisor();
}

// === CARETAKER ===
async function loadCaretakerToday() {
  const date = $("caretakerDate").value;
  try {
    const data = await api(`/tasks/today?date=${date}`);
    const tasks = data.tasks || [];

    const done = tasks.filter(t => t.logged && t.completed).length;
    $("caretakerStats").textContent = `Completed: ${done}/${tasks.length}`;

    const tbody = $("caretakerTasks");
    tbody.innerHTML = "";

    for (const t of tasks) {
      const status = t.logged ? (t.completed ? "Logged ✅" : "Logged (not completed)") : "Not logged";
      const disabled = t.logged && t.completed;

      tbody.innerHTML += `
        <tr>
          <td>${t.taskName}</td>
          <td><span class="badge text-bg-secondary">${t.category}</span></td>
          <td>${status}</td>
          <td>
            <div class="d-flex gap-2">
              <input class="form-control form-control-sm" style="max-width:140px"
                id="qty_${t.taskId}" placeholder="grams (optional)" value="${t.quantityGrams ?? ""}">
              <button class="btn btn-sm btn-success" ${disabled ? "disabled" : ""} data-log="${t.taskId}">Log</button>
            </div>
          </td>
        </tr>
      `;
    }

    // attach listeners
    tbody.querySelectorAll("button[data-log]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const taskId = Number(btn.dataset.log);
        const qtyInput = $(`qty_${taskId}`);
        const qty = qtyInput?.value ? Number(qtyInput.value) : null;

        try {
          await api("/daily-logs", {
            method: "POST",
            json: {
              date,
              taskId,
              completed: true,
              quantityGrams: Number.isFinite(qty) ? qty : null,
              notes: ""
            }
          });
          setAlert("success", "Task logged.");
          await loadCaretakerToday();
        } catch (e) {
          setAlert("danger", e.message);
        }
      });
    });

  } catch (e) {
    setAlert("danger", e.message);
  }
}

// === ADMIN ===
async function loadAdmin() {
  const date = $("adminDate").value;
  try {
    const [missed, warnings, overview] = await Promise.all([
      api(`/admin/missed-tasks?date=${date}`),
      api(`/admin/inventory-warnings?lookbackDays=14&warnDays=21&criticalDays=7`),
      api(`/admin/daily-overview?date=${date}`),
    ]);

    // Missed
    $("adminMissedCount").textContent = `Missed count: ${missed.missedCount}`;
    $("adminMissedList").innerHTML = missed.missedTasks.map(t => `<li>${t.name} (${t.category})</li>`).join("");

    // Warnings
    const wt = $("adminWarningsTable");
    wt.innerHTML = "";
    for (const i of warnings.items) {
      const badge =
        i.status === "CRITICAL" ? "text-bg-danger" :
        i.status === "WARN" ? "text-bg-warning" :
        "text-bg-success";
      wt.innerHTML += `
        <tr>
          <td>${i.name}</td>
          <td><span class="badge ${badge}">${i.status}</span></td>
          <td>${i.stockGrams}</td>
          <td>${i.avgDailyConsumedGrams}</td>
          <td>${i.estimatedDaysRemaining ?? "—"}</td>
          <td>${i.suggestedOrderKg ?? "—"}</td>
        </tr>
      `;
    }

    // Overview
    $("adminTotals").textContent =
      `Total: ${overview.totals?.tasksTotal} | Missing: ${overview.totals?.missing} | Incomplete: ${overview.totals?.incomplete} | Completed: ${overview.totals?.completed}`;

    const ot = $("adminOverviewTable");
    ot.innerHTML = "";
    for (const t of overview.tasks) {
      const badge =
        t.status === "missing" ? "text-bg-danger" :
        t.status === "incomplete" ? "text-bg-warning" :
        "text-bg-success";

      const loggedBy = (t.logs || []).map(l => l.user?.name).filter(Boolean).join(", ");
      ot.innerHTML += `
        <tr>
          <td>${t.taskName}</td>
          <td><span class="badge ${badge}">${t.status}</span> ${t.warning ? "❗" : ""}</td>
          <td>${loggedBy || "<span class='text-muted'>—</span>"}</td>
        </tr>
      `;
    }

  } catch (e) {
    setAlert("danger", e.message);
  }
}

// === SUPERVISOR ===
async function loadSupervisor() {
  const date = $("supDate").value;
  const status = $("supStatus").value;

  try {
    const logs = await api(`/supervisor/logs?date=${date}&status=${status}`);
    const tbody = $("supLogs");
    tbody.innerHTML = "";

    for (const l of logs) {
      const actions = status === "PENDING"
        ? `
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-success" data-approve="${l.id}">Approve</button>
            <button class="btn btn-sm btn-danger" data-reject="${l.id}">Reject</button>
          </div>`
        : `<span class="text-muted">—</span>`;

      tbody.innerHTML += `
        <tr>
          <td>${l.id}</td>
          <td>${l.user?.name || l.user?.email || "—"}</td>
          <td>${l.task?.name || "—"}</td>
          <td>${l.quantityGrams ?? "—"}</td>
          <td class="small">${(l.notes || "").slice(0, 80) || "—"}</td>
          <td><span class="badge text-bg-secondary">${l.approvalStatus || status}</span></td>
          <td>${actions}</td>
        </tr>
      `;
    }

    // listeners
    tbody.querySelectorAll("button[data-approve]").forEach(btn => {
      btn.addEventListener("click", () => decideLog(Number(btn.dataset.approve), "APPROVED"));
    });
    tbody.querySelectorAll("button[data-reject]").forEach(btn => {
      btn.addEventListener("click", () => decideLog(Number(btn.dataset.reject), "REJECTED"));
    });

  } catch (e) {
    setAlert("danger", e.message);
  }
}

async function decideLog(id, approvalStatus) {
  try {
    await api(`/supervisor/logs/${id}`, {
      method: "PATCH",
      json: {
        approvalStatus,
        supervisorNote: approvalStatus === "REJECTED" ? "Please correct and resubmit." : "Checked and confirmed."
      }
    });
    setAlert("success", `Log ${id} -> ${approvalStatus}`);
    await loadSupervisor();
  } catch (e) {
    setAlert("danger", e.message);
  }
}

// === EVENTS ===
document.addEventListener("DOMContentLoaded", async () => {
  // default dates
  $("caretakerDate").value = isoToday();
  $("adminDate").value = isoToday();
  $("supDate").value = isoToday();

  // login
  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const email = $("loginEmail").value.trim();
      const password = $("loginPassword").value;
      const res = await api("/auth/login", { method: "POST", json: { email, password } });
      localStorage.setItem("token", res.token);
      setAlert("success", "Logged in.");
      await loadMe();
    } catch (err) {
      setAlert("danger", err.message);
    }
  });

  // logout
  $("btnLogout").addEventListener("click", () => {
    localStorage.removeItem("token");
    currentUser = null;
    setAlert("info", "Logged out.");
    loadMe();
  });

  // tabs
  document.querySelectorAll("#tabs .nav-link").forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  // refresh buttons
  $("btnLoadToday").addEventListener("click", loadCaretakerToday);
  $("btnLoadAdmin").addEventListener("click", loadAdmin);
  $("btnLoadSupervisor").addEventListener("click", loadSupervisor);

  // init
  await loadMe();
});
