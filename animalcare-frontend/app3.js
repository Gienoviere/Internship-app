const API_BASE = "http://localhost:3001";
function $(id) { return document.getElementById(id); }

function setAlert(type, msg) {
  const box = $("alertBox3");
  box.className = `alert alert-${type}`;
  box.textContent = msg;
  box.classList.remove("d-none");
  setTimeout(() => box.classList.add("d-none"), 4500);
}

function token() { return localStorage.getItem("token"); }

async function api(path, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    if (res.status === 401) {
      alert("Session expired. Please login again.");
      logout3();
      throw new Error("Unauthorized");
    }

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    if (!res.ok) {
      console.error("API error:", data);
      alert(data.error || "Server error");
      throw new Error(data.error || "Request failed");
    }

    return data;
  } catch (err) {
    console.error(err);
    alert("Network or server error");
    throw err;
  }
}


function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

let currentUser = null;
let lastData = { missed: null, warnings: null, overview: null, tasksToday: null, supQueue: null };

function badgeForStatus(status) {
  if (status === "CRITICAL") return "text-bg-danger";
  if (status === "WARN") return "text-bg-warning";
  if (status === "OK") return "text-bg-success";
  return "text-bg-secondary";
}

async function loadMe() {
  // Check eerst of er een token is
  if (!token()) {
    console.log("Geen token gevonden, gebruiker blijft uitgelogd");
    currentUser = null;
    $("roleBadge3").textContent = "Not logged in";
    $("btnLogout3").classList.add("d-none");
    $("viewLogin3").classList.remove("d-none");
    $("viewApp3").classList.add("d-none");
    return; // Stop hier
  }
  
  try {
    currentUser = await api("/auth/me");
    $("roleBadge3").textContent = `${currentUser.role}`;
    $("btnLogout3").classList.remove("d-none");
    $("viewLogin3").classList.add("d-none");
    $("viewApp3").classList.remove("d-none");
    await refreshAll();
  } catch (err) {
    console.error("Auth/me failed:", err);
    // Token is ongeldig, verwijder het
    localStorage.removeItem("token");
    currentUser = null;
    $("roleBadge3").textContent = "Not logged in";
    $("btnLogout3").classList.add("d-none");
    $("viewLogin3").classList.remove("d-none");
    $("viewApp3").classList.add("d-none");
  }
}

async function checkBackend() {
  try {
    await api("/health");
    $("kpiBackend3").textContent = "Online";
    $("badgeBackend3").className = "badge text-bg-success";
    $("badgeBackend3").textContent = "OK";
  } catch {
    $("kpiBackend3").textContent = "Offline";
    $("badgeBackend3").className = "badge text-bg-danger";
    $("badgeBackend3").textContent = "Down";
  }
}

function getRoleView() {
  const v = $("roleView3").value;
  if (v !== "auto") return v;
  const r = currentUser?.role;
  if (r === "ADMIN") return "admin";
  if (r === "SUPERVISOR") return "supervisor";
  return "caretaker";
}

async function loadTasksToday(date) {
  const data = await api(`/tasks/today?date=${date}`);
  lastData.tasksToday = data;

  const tasks = data.tasks || [];
  $("tasksCount3").textContent = `${tasks.length} tasks`;

  const done = tasks.filter(t => t.logged && t.completed).length;
  $("kpiCompleted3").textContent = `${done}/${tasks.length}`;

  const tbody = $("tasksTable3");
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
              id="qty3_${t.taskId}" placeholder="grams (optional)" value="${t.quantityGrams ?? ""}">
            <button class="btn btn-sm btn-primary" ${disabled ? "disabled" : ""} data-log="${t.taskId}">
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
      const date = $("globalDate3").value;
      const qtyVal = $(`qty3_${taskId}`).value;
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
}

async function loadAdminPanels(date) {
  const [missed, warnings, overview] = await Promise.all([
    api(`/admin/missed-tasks?date=${date}`),
    api(`/admin/inventory-warnings?lookbackDays=14&warnDays=21&criticalDays=7`),
    api(`/admin/daily-overview?date=${date}`),
  ]);

  lastData.missed = missed;
  lastData.warnings = warnings;
  lastData.overview = overview;

  // KPI: missed
  $("kpiMissed3").textContent = String(missed.missedCount);
  $("missedCount3").textContent = String(missed.missedCount);

  // KPI: alerts
  const alerts = warnings.items.filter(i => i.status === "WARN" || i.status === "CRITICAL").length;
  $("kpiAlerts3").textContent = String(alerts);

  // warnings table (top 6)
  const wt = $("warningsTable3");
  wt.innerHTML = "";
  warnings.items.slice(0, 6).forEach(i => {
    wt.innerHTML += `
      <tr>
        <td>${i.name}</td>
        <td><span class="badge ${badgeForStatus(i.status)}">${i.status}</span></td>
        <td class="text-end">${i.stockGrams}</td>
      </tr>
    `;
  });

  // overview table
  $("overviewTotals3").textContent =
    `Total: ${overview.totals?.tasksTotal} • Completed: ${overview.totals?.completed} • Missing: ${overview.totals?.missing} • Incomplete: ${overview.totals?.incomplete}`;

  const ot = $("overviewTable3");
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

  // modal details cache
  $("modalMissed3").innerHTML = missed.missedTasks.length
    ? missed.missedTasks.map(t => `<div>• <span class="fw-semibold">${t.name}</span> <span class="text-muted">(${t.category})</span></div>`).join("")
    : `<div class="text-muted">No missed tasks.</div>`;

  $("modalWarnings3").innerHTML = warnings.items.map(i => `
    <div class="border rounded-3 p-2 mb-2">
      <div class="d-flex justify-content-between">
        <div class="fw-semibold">${i.name}</div>
        <span class="badge ${badgeForStatus(i.status)}">${i.status}</span>
      </div>
      <div class="small text-muted">Stock: ${i.stockGrams}g • Avg/day: ${i.avgDailyConsumedGrams}g • Days left: ${i.estimatedDaysRemaining ?? "—"}</div>
      <div class="small text-muted">Suggested order: ${i.suggestedOrderKg ?? "—"} kg</div>
      ${i.reorderRule ? `<div class="small mt-1">${i.reorderRule}</div>` : ""}
    </div>
  `).join("");
}

async function loadSupervisorQueue(date) {
  // Show PENDING queue (if endpoint exists)
  try {
    const logs = await api(`/supervisor/logs?date=${date}&status=PENDING`);
    lastData.supQueue = logs;

    const wrap = $("supQueue3");
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
    $("supQueue3").innerHTML = `<div class="small text-muted">Supervisor endpoints not available for this user.</div>`;
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
  const date = $("globalDate3").value;
  await checkBackend();

  // Always load caretaker tasks (KPIs depend on them)
  await loadTasksToday(date);

  const view = getRoleView();
  // Admin panels only if admin or role toggle says admin
  if (view === "admin" || currentUser?.role === "ADMIN") {
    await loadAdminPanels(date);
  } else {
    // still keep KPIs sane
    $("kpiMissed3").textContent = "—";
    $("kpiAlerts3").textContent = "—";
    $("missedCount3").textContent = "—";
    $("warningsTable3").innerHTML = "";
    $("overviewTable3").innerHTML = "";
    $("overviewTotals3").textContent = "—";
  }

  // Supervisor queue if supervisor/admin
  if (view === "supervisor" || currentUser?.role === "SUPERVISOR" || currentUser?.role === "ADMIN") {
    await loadSupervisorQueue(date);
  } else {
    $("supQueue3").innerHTML = `<div class="small text-muted">Not available for this role.</div>`;
  }

  // Update page header copy
  if (view === "admin") {
    $("pageTitle3").textContent = "Admin Dashboard";
    $("pageSubtitle3").textContent = "Overview, missed tasks, inventory warnings, and daily status.";
  } else if (view === "supervisor") {
    $("pageTitle3").textContent = "Supervisor Dashboard";
    $("pageSubtitle3").textContent = "Approve or reject pending daily logs.";
  } else if (view === "caretaker") {
    $("pageTitle3").textContent = "Caretaker Dashboard";
    $("pageSubtitle3").textContent = "Log daily tasks quickly and accurately.";
  } else {
    $("pageTitle3").textContent = "Dashboard";
    $("pageSubtitle3").textContent = "Professional backend-connected mockup.";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  $("globalDate3").value = isoToday();

  // login
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

  $("loginForm3").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  console.log("=== DEBUG LOGIN START ===");
  
  try {
    const email = $("loginEmail3").value.trim();
    const password = $("loginPassword3").value;
    
    console.log("1. Form values:", { email, password });
    console.log("2. API_BASE:", API_BASE);
    console.log("3. Full URL:", `${API_BASE}/auth/login`);
    
    // Debug de API call zelf
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });
    
    console.log("4. Response status:", res.status, res.statusText);
    console.log("5. Response headers:");
    for (const [key, value] of res.headers.entries()) {
      console.log(`   ${key}: ${value}`);
    }
    
    const responseText = await res.text();
    console.log("6. Raw response text:", responseText);
    
    // Probeer te parsen als JSON
    let parsedData = null;
    try {
      parsedData = responseText ? JSON.parse(responseText) : null;
      console.log("7. Parsed JSON:", parsedData);
    } catch (parseErr) {
      console.log("7. Could not parse as JSON:", parseErr.message);
    }
    
    if (!res.ok) {
      console.error("8. HTTP ERROR:", res.status, responseText);
      throw new Error(`Login failed: ${res.status} ${responseText}`);
    }
    
    console.log("9. Token received:", parsedData?.token ? "YES" : "NO");
    
    if (parsedData?.token) {
      localStorage.setItem("token", parsedData.token);
      console.log("10. Token saved to localStorage");
      setAlert("success", "Logged in.");
      await loadMe();
    } else {
      console.error("11. No token in response!");
      setAlert("danger", "No token received from server");
    }
    
  } catch (err) {
    console.error("12. CATCH BLOCK ERROR:", err);
    console.error("13. Error stack:", err.stack);
    setAlert("danger", `Login failed: ${err.message}`);
  }
  
  console.log("=== DEBUG LOGIN END ===");
});

  $("btnDemoFill3").addEventListener("click", () => {
    $("loginEmail3").value = "admin@example.com";
    $("loginPassword3").value = "password";
  });

  $("btnLogout3").addEventListener("click", () => {
    localStorage.removeItem("token");
    currentUser = null;
    setAlert("info", "Logged out.");
    loadMe();
  });

  $("btnRefresh3").addEventListener("click", refreshAll);
  $("roleView3").addEventListener("change", refreshAll);
  $("globalDate3").addEventListener("change", refreshAll);

  // details modal
  $("btnOpenDetails3").addEventListener("click", () => {
    const modal = new bootstrap.Modal(document.getElementById("detailsModal3"));
    modal.show();
  });

  await loadMe();

  function applyRoleVisibility() {
  const role = currentUser.role;

  // Caretaker section
  document.getElementById("caretakerSection3").style.display =
    role === "USER" || role === "SUPERVISOR" || role === "ADMIN"
      ? "block"
      : "none";

  // Admin section
  document.getElementById("adminSection3").style.display =
    role === "ADMIN" ? "block" : "none";

  // Supervisor section
  document.getElementById("supervisorSection3").style.display =
    role === "SUPERVISOR" || role === "ADMIN"
      ? "block"
      : "none";
}

});
