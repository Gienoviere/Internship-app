const API_BASE = "http://localhost:3001";
function $(id) { return document.getElementById(id); }

function setAlert(type, msg) {
  const box = $("alertBox4");
  box.className = `alert alert-${type}`;
  box.textContent = msg;
  box.classList.remove("d-none");
  setTimeout(() => box.classList.add("d-none"), 4500);
}

function token() { return localStorage.getItem("token"); }

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
  if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  return data;
}

function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

let currentUser = null;
let currentPane = "dashboard";

function badgeForStatus(status) {
  if (status === "CRITICAL") return "text-bg-danger";
  if (status === "WARN") return "text-bg-warning";
  if (status === "OK") return "text-bg-success";
  return "text-bg-secondary";
}

function setPane(pane) {
  currentPane = pane;

  // nav active
  document.querySelectorAll("#nav4 .nav-link").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === pane);
  });

  // show/hide panes
  $("paneDashboard4").classList.toggle("d-none", pane !== "dashboard");
  $("paneTasks4").classList.toggle("d-none", pane !== "tasks");
  $("paneAdmin4").classList.toggle("d-none", pane !== "admin");
  $("paneSupervisor4").classList.toggle("d-none", pane !== "supervisor");

  // titles
  const roleView = getRoleView();
  if (pane === "dashboard") {
    $("pageTitle4").textContent = "Dashboard";
    $("pageSubtitle4").textContent = "Overview of tasks, warnings, and approvals.";
  } else if (pane === "tasks") {
    $("pageTitle4").textContent = "Tasks";
    $("pageSubtitle4").textContent = "Caretaker daily logging.";
  } else if (pane === "admin") {
    $("pageTitle4").textContent = "Admin";
    $("pageSubtitle4").textContent = "Missed tasks, inventory warnings, daily overview.";
  } else if (pane === "supervisor") {
    $("pageTitle4").textContent = "Supervisor";
    $("pageSubtitle4").textContent = "Approve or reject daily logs.";
  }

  // Role-based visibility
  const r = currentUser?.role;
  const navAdmin = document.querySelector('#nav4 button[data-view="admin"]');
  const navSup = document.querySelector('#nav4 button[data-view="supervisor"]');

  navAdmin.disabled = (r !== "ADMIN") && (roleView !== "admin");
  navSup.disabled = !(r === "SUPERVISOR" || r === "ADMIN") && (roleView !== "supervisor");
}

function getRoleView() {
  const v = $("roleView4").value;
  if (v !== "auto") return v;
  const r = currentUser?.role;
  if (r === "ADMIN") return "admin";
  if (r === "SUPERVISOR") return "supervisor";
  return "caretaker";
}

async function loadMe() {
  try {
    currentUser = await api("/auth/me");
    $("roleBadge4").textContent = `${currentUser.role}`;
    $("btnLogout4").classList.remove("d-none");
    $("viewLogin4").classList.add("d-none");
    $("viewApp4").classList.remove("d-none");
    await refreshAll();
  } catch {
    currentUser = null;
    $("roleBadge4").textContent = "Not logged in";
    $("btnLogout4").classList.add("d-none");
    $("viewLogin4").classList.remove("d-none");
    $("viewApp4").classList.add("d-none");
  }
}

async function checkBackend() {
  try {
    await api("/health");
    $("kpiBackend4").textContent = "Online";
    $("badgeBackend4").className = "badge text-bg-success";
    $("badgeBackend4").textContent = "OK";
  } catch {
    $("kpiBackend4").textContent = "Offline";
    $("badgeBackend4").className = "badge text-bg-danger";
    $("badgeBackend4").textContent = "Down";
  }
}

async function loadTasks(date) {
  const data = await api(`/tasks/today?date=${date}`);
  const tasks = data.tasks || [];

  $("tasksCount4").textContent = `${tasks.length} tasks`;

  const done = tasks.filter(t => t.logged && t.completed).length;
  $("kpiCompleted4").textContent = `${done}/${tasks.length}`;

  const render = (tbodyId) => {
    const tbody = $(tbodyId);
    tbody.innerHTML = "";

    tasks.forEach(t => {
      const status = t.logged ? (t.completed ? "Logged" : "Logged (incomplete)") : "Not logged";
      const badge =
        t.logged && t.completed ? "text-bg-success" :
        t.logged ? "text-bg-warning" :
        "text-bg-secondary";

      const disabled = t.logged && t.completed;

      tbody.innerHTML += `
        <tr>
          <td>${t.taskName}</td>
          <td><span class="badge text-bg-light border">${t.category}</span></td>
          <td><span class="badge ${badge}">${status}</span></td>
          <td>
            <div class="d-flex gap-2">
              <input class="form-control form-control-sm" style="max-width:140px"
                id="${tbodyId}_qty_${t.taskId}" placeholder="grams (optional)" value="${t.quantityGrams ?? ""}">
              <button class="btn btn-sm btn-primary" ${disabled ? "disabled" : ""} data-log="${t.taskId}" data-target="${tbodyId}">
                Log
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.querySelectorAll("button[data-log]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const taskId = Number(btn.dataset.log);
        const date = $("globalDate4").value;
        const qtyVal = $(`${btn.dataset.target}_qty_${taskId}`).value;
        const qty = qtyVal ? Number(qtyVal) : null;

        try {
          await api("/daily-logs", {
            method: "POST",
            json: { date, taskId, completed: true, quantityGrams: Number.isFinite(qty) ? qty : null, notes: "" }
          });
          setAlert("success", "Task logged.");
          await refreshAll();
        } catch (e) {
          setAlert("danger", e.message);
        }
      });
    });
  };

  render("tasksTable4");
  render("tasksTable4b");
}

async function loadWarningsSummary() {
  try {
    const warnings = await api(`/admin/inventory-warnings?lookbackDays=14&warnDays=21&criticalDays=7`);
    const items = warnings.items || [];

    const alerts = items.filter(i => i.status === "WARN" || i.status === "CRITICAL").length;
    $("kpiAlerts4").textContent = String(alerts);

    // dashboard summary
    const wt = $("warningsTable4");
    wt.innerHTML = "";
    items.slice(0, 6).forEach(i => {
      wt.innerHTML += `
        <tr>
          <td>${i.name}</td>
          <td><span class="badge ${badgeForStatus(i.status)}">${i.status}</span></td>
          <td class="text-end">${i.stockGrams}</td>
        </tr>
      `;
    });

    // admin full table
    const wtb = $("warningsTable4b");
    wtb.innerHTML = "";
    items.forEach(i => {
      wtb.innerHTML += `
        <tr>
          <td>${i.name}</td>
          <td><span class="badge ${badgeForStatus(i.status)}">${i.status}</span></td>
          <td class="text-end">${i.stockGrams}</td>
          <td class="text-end">${i.avgDailyConsumedGrams}</td>
          <td class="text-end">${i.estimatedDaysRemaining ?? "—"}</td>
          <td class="text-end">${i.suggestedOrderKg ?? "—"}</td>
        </tr>
      `;
    });

  } catch {
    $("kpiAlerts4").textContent = "—";
    $("warningsTable4").innerHTML = "";
    $("warningsTable4b").innerHTML = "";
  }
}

async function loadAdmin(date) {
  try {
    const [missed, overview] = await Promise.all([
      api(`/admin/missed-tasks?date=${date}`),
      api(`/admin/daily-overview?date=${date}`)
    ]);

    $("kpiMissed4").textContent = String(missed.missedCount);
    $("missedCount4b").textContent = String(missed.missedCount);

    $("missedList4b").innerHTML = missed.missedTasks.length
      ? missed.missedTasks.map(t => `<div>• ${t.name} <span class="text-muted">(${t.category})</span></div>`).join("")
      : `<div class="text-muted">No missed tasks.</div>`;

    $("overviewTotals4").textContent =
      `Total: ${overview.totals?.tasksTotal} • Completed: ${overview.totals?.completed} • Missing: ${overview.totals?.missing} • Incomplete: ${overview.totals?.incomplete}`;

    const ot = $("overviewTable4");
    ot.innerHTML = "";
    overview.tasks.forEach(t => {
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
    });

  } catch {
    $("kpiMissed4").textContent = "—";
    $("missedCount4b").textContent = "—";
    $("missedList4b").innerHTML = `<div class="text-muted">Not available for this role.</div>`;
    $("overviewTable4").innerHTML = "";
  }
}

async function loadSupervisor(date) {
  const status = $("supStatus4").value;

  try {
    const logs = await api(`/supervisor/logs?date=${date}&status=${status}`);
    const wrap = $("supList4");
    wrap.innerHTML = "";

    logs.forEach(l => {
      const actions = status === "PENDING"
        ? `
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-success" data-approve="${l.id}">Approve</button>
            <button class="btn btn-sm btn-outline-danger" data-reject="${l.id}">Reject</button>
          </div>`
        : `<div class="small text-muted">No actions</div>`;

      wrap.innerHTML += `
        <div class="p-3 border rounded-4 bg-white d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">${l.task?.name || "—"}</div>
            <div class="small text-muted">User: ${l.user?.name || l.user?.email || "—"} • Qty: ${l.quantityGrams ?? "—"}g</div>
            <div class="small text-muted">Notes: ${(l.notes || "—").slice(0, 120)}</div>
          </div>
          <div class="text-end">
            <div class="small text-muted mb-2">#${l.id}</div>
            ${actions}
          </div>
        </div>
      `;
    });

    wrap.querySelectorAll("button[data-approve]").forEach(btn => {
      btn.addEventListener("click", () => decideLog(btn.dataset.approve, "APPROVED"));
    });
    wrap.querySelectorAll("button[data-reject]").forEach(btn => {
      btn.addEventListener("click", () => decideLog(btn.dataset.reject, "REJECTED"));
    });

  } catch {
    $("supList4").innerHTML = `<div class="text-muted">Not available for this role.</div>`;
  }
}

async function loadSupervisorQueue(date) {
  try {
    const logs = await api(`/supervisor/logs?date=${date}&status=PENDING`);
    const wrap = $("supQueue4");
    wrap.innerHTML = "";

    logs.slice(0, 3).forEach(l => {
      wrap.innerHTML += `
        <div class="border rounded-3 p-2 bg-white">
          <div class="d-flex justify-content-between">
            <div class="fw-semibold small">${l.task?.name || "Task"}</div>
            <span class="badge text-bg-secondary">PENDING</span>
          </div>
          <div class="small text-muted">User: ${l.user?.name || l.user?.email || "—"} • Qty: ${l.quantityGrams ?? "—"}g</div>
          <div class="d-flex gap-2 mt-2">
            <button class="btn btn-sm btn-success" data-approve="${l.id}">Approve</button>
            <button class="btn btn-sm btn-outline-danger" data-reject="${l.id}">Reject</button>
          </div>
        </div>
      `;
    });

    wrap.querySelectorAll("button[data-approve]").forEach(btn => {
      btn.addEventListener("click", () => decideLog(btn.dataset.approve, "APPROVED"));
    });
    wrap.querySelectorAll("button[data-reject]").forEach(btn => {
      btn.addEventListener("click", () => decideLog(btn.dataset.reject, "REJECTED"));
    });

  } catch {
    $("supQueue4").innerHTML = `<div class="small text-muted">Not available for this role.</div>`;
  }
}

async function decideLog(id, approvalStatus) {
  try {
    await api(`/supervisor/logs/${id}`, {
      method: "PATCH",
      json: { approvalStatus, supervisorNote: approvalStatus === "REJECTED" ? "Please correct and resubmit." : "Checked and confirmed." }
    });
    setAlert("success", `Log #${id} ${approvalStatus}`);
    await refreshAll();
  } catch (e) {
    setAlert("danger", e.message);
  }
}

async function refreshAll() {
  const date = $("globalDate4").value;
  await checkBackend();

  await loadTasks(date);

  const roleView = getRoleView();
  const role = currentUser?.role;

  // warnings are admin-only; attempt anyway but ignore failures
  await loadWarningsSummary();

  if (role === "ADMIN" || roleView === "admin") {
    await loadAdmin(date);
  }

  if (role === "SUPERVISOR" || role === "ADMIN" || roleView === "supervisor") {
    await loadSupervisorQueue(date);
    await loadSupervisor(date);
  } else {
    $("supQueue4").innerHTML = `<div class="small text-muted">Not available for this role.</div>`;
    $("supList4").innerHTML = `<div class="text-muted">Not available for this role.</div>`;
  }

  setPane(currentPane);
}

document.addEventListener("DOMContentLoaded", async () => {
  $("globalDate4").value = isoToday();

  // sidebar toggle
  $("btnToggleSidebar4").addEventListener("click", () => {
    $("sidebar4").classList.toggle("collapsed");
  });

  // nav click
  document.querySelectorAll("#nav4 .nav-link").forEach(btn => {
    btn.addEventListener("click", () => setPane(btn.dataset.view));
  });

  // refresh
  $("btnRefresh4").addEventListener("click", refreshAll);
  $("roleView4").addEventListener("change", refreshAll);
  $("globalDate4").addEventListener("change", refreshAll);
  $("supStatus4").addEventListener("change", refreshAll);

  // login
  $("loginForm4").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const email = $("loginEmail4").value.trim();
      const password = $("loginPassword4").value;
      const res = await api("/auth/login", { method: "POST", json: { email, password } });
      localStorage.setItem("token", res.token);
      setAlert("success", "Logged in.");
      await loadMe();
    } catch (err) {
      setAlert("danger", err.message);
    }
  });

  $("btnDemoFill4").addEventListener("click", () => {
    $("loginEmail4").value = "admin@example.com";
    $("loginPassword4").value = "password";
  });

  $("btnLogout4").addEventListener("click", () => {
    localStorage.removeItem("token");
    currentUser = null;
    setAlert("info", "Logged out.");
    loadMe();
  });

  await loadMe();
});
