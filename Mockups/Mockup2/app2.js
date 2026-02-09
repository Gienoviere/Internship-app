const API_BASE = "http://localhost:3001";

function $(id) { return document.getElementById(id); }

function setAlert(type, msg) {
  const box = $("alertBox2");
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

function setRoleUI() {
  const role = currentUser?.role || null;

  $("roleBadge2").textContent = role ? `${role}` : "Not logged in";
  $("chipUser2").textContent = currentUser ? `${currentUser.name || currentUser.email || "User"}` : "—";

  $("btnLogout2").classList.toggle("d-none", !currentUser);

  // Sidebar visibility
  const btnAdmin = document.querySelector('#nav2 button[data-view="admin"]');
  const btnSup = document.querySelector('#nav2 button[data-view="supervisor"]');
  btnAdmin.classList.toggle("d-none", role !== "ADMIN");
  btnSup.classList.toggle("d-none", !(role === "SUPERVISOR" || role === "ADMIN"));

  $("btnGoAdmin2").classList.toggle("d-none", role !== "ADMIN");
  $("btnGoSupervisor2").classList.toggle("d-none", !(role === "SUPERVISOR" || role === "ADMIN"));
}

function showLogin() {
  $("viewLogin2").classList.remove("d-none");
  $("viewApp2").classList.add("d-none");
}

function showApp() {
  $("viewLogin2").classList.add("d-none");
  $("viewApp2").classList.remove("d-none");
}

function setBackendBadge(ok) {
  const b = $("badgeBackend2");
  if (ok) {
    b.className = "badge text-bg-success";
    b.textContent = "Online";
  } else {
    b.className = "badge text-bg-danger";
    b.textContent = "Offline";
  }
}

function setPage(title, subtitle) {
  $("pageTitle2").textContent = title;
  $("pageSubtitle2").textContent = subtitle || "";
}

function setActiveNav(view) {
  document.querySelectorAll("#nav2 .nav-link").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
}

function showPane(view) {
  $("paneHome2").classList.toggle("d-none", view !== "home");
  $("paneTasks2").classList.toggle("d-none", view !== "tasks");
  $("paneAdmin2").classList.toggle("d-none", view !== "admin");
  $("paneSupervisor2").classList.toggle("d-none", view !== "supervisor");
}

async function switchView(view) {
  setActiveNav(view);
  showPane(view);

  if (view === "home") {
    setPage("Home", "Welcome. Choose an option in the sidebar.");
  }

  if (view === "tasks") {
    setPage("Today’s Tasks", "Quick logging for caretakers.");
    await loadTasks();
  }

  if (view === "admin") {
    setPage("Admin Overview", "Missed tasks, inventory warnings, and daily status.");
    await loadAdmin();
  }

  if (view === "supervisor") {
    setPage("Supervisor Review", "Approve or reject daily logs.");
    await loadSupervisor();
  }
}

async function loadMe() {
  try {
    currentUser = await api("/auth/me");
    setRoleUI();
    showApp();
    await switchView(currentUser.role === "ADMIN" ? "admin" : currentUser.role === "SUPERVISOR" ? "supervisor" : "tasks");
  } catch {
    currentUser = null;
    setRoleUI();
    showLogin();
  }
}

// HOME: backend online check
async function checkBackend() {
  try {
    await api("/health");
    setBackendBadge(true);
  } catch {
    setBackendBadge(false);
  }
}

// TASKS
async function loadTasks() {
  const date = $("tasksDate2").value;
  try {
    const data = await api(`/tasks/today?date=${date}`);
    const tasks = data.tasks || [];
    const done = tasks.filter(t => t.logged && t.completed).length;
    $("tasksStats2").textContent = `Completed ${done}/${tasks.length}`;

    const list = $("tasksList2");
    list.innerHTML = "";

    tasks.forEach(t => {
      const disabled = t.logged && t.completed;
      const status =
        t.logged ? (t.completed ? "Logged" : "Logged (incomplete)") : "Not logged";

      list.innerHTML += `
        <div class="p-3 bg-white border rounded-4 d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-semibold">${t.taskName}</div>
            <div class="small muted">${t.category} • ${status}</div>
          </div>

          <div class="d-flex gap-2 align-items-center">
            <input class="form-control form-control-sm" style="width:140px"
              placeholder="grams (optional)" id="qty2_${t.taskId}" value="${t.quantityGrams ?? ""}">
            <button class="btn btn-sm btn-primary" ${disabled ? "disabled" : ""} data-log="${t.taskId}">
              Log
            </button>
          </div>
        </div>
      `;
    });

    list.querySelectorAll("button[data-log]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const taskId = Number(btn.dataset.log);
        const qtyVal = $(`qty2_${taskId}`).value;
        const qty = qtyVal ? Number(qtyVal) : null;

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
          setAlert("success", "Logged.");
          await loadTasks();
        } catch (e) {
          setAlert("danger", e.message);
        }
      });
    });
  } catch (e) {
    setAlert("danger", e.message);
  }
}

// ADMIN
async function loadAdmin() {
  const date = $("adminDate2").value;

  try {
    const [missed, warnings, overview] = await Promise.all([
      api(`/admin/missed-tasks?date=${date}`),
      api(`/admin/inventory-warnings?lookbackDays=14&warnDays=21&criticalDays=7`),
      api(`/admin/daily-overview?date=${date}`),
    ]);

    $("adminMissedCount2").textContent = `Missed: ${missed.missedCount}`;
    $("adminMissedList2").innerHTML = missed.missedTasks.length
      ? missed.missedTasks.map(t => `<div class="small">• ${t.name} <span class="muted">(${t.category})</span></div>`).join("")
      : `<div class="small muted">No missed tasks.</div>`;

    const warnWrap = $("adminWarnings2");
    warnWrap.innerHTML = "";
    warnings.items.forEach(i => {
      const badge =
        i.status === "CRITICAL" ? "text-bg-danger" :
        i.status === "WARN" ? "text-bg-warning" :
        "text-bg-success";

      warnWrap.innerHTML += `
        <div class="p-3 border rounded-4 bg-white d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">${i.name}</div>
            <div class="small muted">Stock: ${i.stockGrams}g • Avg/day: ${i.avgDailyConsumedGrams}g • Days left: ${i.estimatedDaysRemaining ?? "—"}</div>
            <div class="small muted">Suggested order: ${i.suggestedOrderKg ?? "—"} kg</div>
          </div>
          <span class="badge ${badge}">${i.status}</span>
        </div>
      `;
    });

    $("adminTotals2").textContent =
      `Total: ${overview.totals?.tasksTotal} • Missing: ${overview.totals?.missing} • Incomplete: ${overview.totals?.incomplete} • Completed: ${overview.totals?.completed}`;

    const over = $("adminOverview2");
    over.innerHTML = "";
    overview.tasks.forEach(t => {
      const badge =
        t.status === "missing" ? "text-bg-danger" :
        t.status === "incomplete" ? "text-bg-warning" :
        "text-bg-success";

      const names = (t.logs || []).map(l => l.user?.name).filter(Boolean);
      over.innerHTML += `
        <div class="p-3 border rounded-4 bg-white d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">${t.taskName}</div>
            <div class="small muted">Logged by: ${names.length ? names.join(", ") : "—"}</div>
          </div>
          <div class="d-flex align-items-center gap-2">
            ${t.warning ? "<span class='small'>❗</span>" : ""}
            <span class="badge ${badge}">${t.status}</span>
          </div>
        </div>
      `;
    });

  } catch (e) {
    setAlert("danger", e.message);
  }
}

// SUPERVISOR
async function loadSupervisor() {
  const date = $("supDate2").value;
  const status = $("supStatus2").value;

  try {
    const logs = await api(`/supervisor/logs?date=${date}&status=${status}`);
    const wrap = $("supList2");
    wrap.innerHTML = "";

    logs.forEach(l => {
      const actions = status === "PENDING"
        ? `
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-success" data-approve="${l.id}">Approve</button>
            <button class="btn btn-sm btn-outline-danger" data-reject="${l.id}">Reject</button>
          </div>`
        : `<div class="small muted">No actions</div>`;

      wrap.innerHTML += `
        <div class="p-3 border rounded-4 bg-white d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">${l.task?.name || "—"}</div>
            <div class="small muted">User: ${l.user?.name || l.user?.email || "—"} • Qty: ${l.quantityGrams ?? "—"}g</div>
            <div class="small muted">Notes: ${(l.notes || "—").slice(0, 120)}</div>
          </div>
          <div class="text-end">
            <div class="small muted mb-2">#${l.id}</div>
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
    setAlert("success", `Log #${id} ${approvalStatus}`);
    await loadSupervisor();
  } catch (e) {
    setAlert("danger", e.message);
  }
}

// EVENTS
document.addEventListener("DOMContentLoaded", async () => {
  $("tasksDate2").value = isoToday();
  $("adminDate2").value = isoToday();
  $("supDate2").value = isoToday();

  // login
  $("loginForm2").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const email = $("loginEmail2").value.trim();
      const password = $("loginPassword2").value;
      const res = await api("/auth/login", { method: "POST", json: { email, password } });
      localStorage.setItem("token", res.token);
      setAlert("success", "Logged in.");
      await loadMe();
    } catch (err) {
      setAlert("danger", err.message);
    }
  });

  $("btnDemoFill").addEventListener("click", () => {
    $("loginEmail2").value = "admin@example.com";
    $("loginPassword2").value = "password";
  });

  // logout
  $("btnLogout2").addEventListener("click", () => {
    localStorage.removeItem("token");
    currentUser = null;
    setAlert("info", "Logged out.");
    loadMe();
  });

  // sidebar nav
  document.querySelectorAll("#nav2 .nav-link").forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  // quick action buttons
  $("btnGoTasks2").addEventListener("click", () => switchView("tasks"));
  $("btnGoAdmin2").addEventListener("click", () => switchView("admin"));
  $("btnGoSupervisor2").addEventListener("click", () => switchView("supervisor"));

  // refresh buttons
  $("btnRefreshTasks2").addEventListener("click", loadTasks);
  $("btnRefreshAdmin2").addEventListener("click", loadAdmin);
  $("btnRefreshSup2").addEventListener("click", loadSupervisor);

  await checkBackend();
  await loadMe();
});
