const API_BASE = "http://localhost:3001";
function $(id) { return document.getElementById(id); }

function setAlert(type, msg) {
  const box = $("alertBox3");
  box.className = `alert alert-${type} d-flex align-items-center`; // Bootstrap alert met icon
  box.innerHTML = `<i class="bi bi-${type === 'success' ? 'check-circle-fill' : type === 'danger' ? 'exclamation-triangle-fill' : 'info-circle-fill'} me-2"></i>${msg}`;
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
let lastData = { missed: null, warnings: null, overview: null, tasksToday: null, supQueue: null };

function badgeForStatus(status) {
  if (status === "CRITICAL") return "text-bg-danger";
  if (status === "WARN") return "text-bg-warning";
  if (status === "OK") return "text-bg-success";
  return "text-bg-secondary";
}

async function loadMe() {
  if (!token()) {
    console.log("Geen token gevonden, gebruiker blijft uitgelogd");
    currentUser = null;
    $("roleBadge3").innerHTML = '<span class="badge bg-secondary">Not logged in</span>';
    $("btnLogout3").classList.add("d-none");
    $("viewLogin3").classList.remove("d-none");
    $("viewApp3").classList.add("d-none");
    return;
  }
  
  try {
    currentUser = await api("/auth/me");
    $("roleBadge3").innerHTML = `<span class="badge bg-${currentUser.role === 'ADMIN' ? 'danger' : currentUser.role === 'SUPERVISOR' ? 'warning' : 'info'}">${currentUser.role}</span>`;
    $("btnLogout3").classList.remove("d-none");
    $("viewLogin3").classList.add("d-none");
    $("viewApp3").classList.remove("d-none");
    await refreshAll();
  } catch (err) {
    console.error("Auth/me failed:", err);
    localStorage.removeItem("token");
    currentUser = null;
    $("roleBadge3").innerHTML = '<span class="badge bg-secondary">Not logged in</span>';
    $("btnLogout3").classList.add("d-none");
    $("viewLogin3").classList.remove("d-none");
    $("viewApp3").classList.add("d-none");
  }
}

async function checkBackend() {
  try {
    await api("/health");
    $("kpiBackend3").innerHTML = '<span class="badge bg-success">Online</span>';
  } catch {
    $("kpiBackend3").innerHTML = '<span class="badge bg-danger">Offline</span>';
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
  $("tasksCount3").textContent = `${tasks.length} taken`;

  const done = tasks.filter(t => t.logged && t.completed).length;
  $("kpiCompleted3").innerHTML = `<span class="badge bg-success">${done}/${tasks.length} voltooid</span>`;

  const tbody = $("tasksTable3");
  tbody.innerHTML = "";

  tasks.forEach(t => {
    const status = t.logged ? (t.completed ? "Logged" : "Logged (incomplete)") : "Not logged";
    const badgeClass = t.logged && t.completed ? "text-bg-success" : t.logged ? "text-bg-warning" : "text-bg-secondary";
    const disabled = t.logged && t.completed;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><span class="fw-semibold">${t.taskName}</span></td>
      <td><span class="badge bg-light text-dark border">${t.category}</span></td>
      <td><span class="badge ${badgeClass}">${status}</span></td>
      <td>
        <div class="d-flex gap-2">
          <input class="form-control form-control-sm" style="max-width:120px" 
            id="qty3_${t.taskId}" placeholder="gram" value="${t.quantityGrams ?? ""}">
          <button class="btn btn-sm btn-${disabled ? 'secondary' : 'primary'}" ${disabled ? "disabled" : ""} data-log="${t.taskId}">
            <i class="bi bi-check-circle me-1"></i>Log
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
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

  // --- Missed tasks KPI als card ---
  const missedCount = missed.missedCount;
  $("kpiMissed3").innerHTML = `
    <div class="card border-danger mb-3">
      <div class="card-body text-danger p-3">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h6 class="card-title mb-0"><i class="bi bi-exclamation-triangle-fill me-1"></i>Gemiste taken</h6>
            <span class="fs-3 fw-bold">${missedCount}</span>
          </div>
          <span class="badge bg-danger">⚠️ actie</span>
        </div>
      </div>
    </div>
  `;
  $("missedCount3").textContent = missedCount;

  // --- Inventory warnings: vervang tabel door Bootstrap alerts ---
  const alerts = warnings.items.filter(i => i.status === "WARN" || i.status === "CRITICAL").length;
  $("kpiAlerts3").innerHTML = `<span class="badge bg-warning">${alerts} waarschuwingen</span>`;

  const warningsContainer = $("warningsTable3");
  // Vervang tbody door div met alerts (als dat nog niet is gedaan)
  if (warningsContainer.tagName !== "DIV") {
    const parent = warningsContainer.parentNode;
    const newDiv = document.createElement("div");
    newDiv.id = "warningsTable3";
    newDiv.className = "d-flex flex-column gap-2";
    parent.replaceChild(newDiv, warningsContainer);
    warningsContainer = newDiv;
  }
  warningsContainer.innerHTML = warnings.items.slice(0, 6).map(i => `
    <div class="alert alert-${i.status === 'CRITICAL' ? 'danger' : i.status === 'WARN' ? 'warning' : 'success'} d-flex align-items-center mb-0 p-2">
      <i class="bi bi-${i.status === 'CRITICAL' ? 'exclamation-triangle-fill' : i.status === 'WARN' ? 'exclamation-triangle' : 'check-circle-fill'} me-2"></i>
      <div class="flex-grow-1">
        <strong>${i.name}</strong><br>
        <small>Voorraad: ${i.stockGrams}g · Gem. verbruik: ${i.avgDailyConsumedGrams}g/dag · Dagen over: ${i.estimatedDaysRemaining ?? '—'}</small>
      </div>
      <span class="badge ${badgeForStatus(i.status)}">${i.status}</span>
    </div>
  `).join("");

  // --- Daily overview tabel in Bootstrap stijl ---
  $("overviewTotals3").innerHTML = `
    <span class="badge bg-secondary">Totaal: ${overview.totals?.tasksTotal}</span>
    <span class="badge bg-success">Voltooid: ${overview.totals?.completed}</span>
    <span class="badge bg-danger">Missing: ${overview.totals?.missing}</span>
    <span class="badge bg-warning">Incompleet: ${overview.totals?.incomplete}</span>
  `;

  const ot = $("overviewTable3");
  ot.innerHTML = "";
  overview.tasks.forEach(t => {
    const badgeClass = t.status === "missing" ? "text-bg-danger" : t.status === "incomplete" ? "text-bg-warning" : "text-bg-success";
    const loggedBy = (t.logs || []).map(l => l.user?.name).filter(Boolean).join(", ");
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${t.taskName}</td>
      <td><span class="badge ${badgeClass}">${t.status}</span> ${t.warning ? '❗' : ''}</td>
      <td>${loggedBy || '<span class="text-muted">—</span>'}</td>
    `;
    ot.appendChild(row);
  });

  // Missed taken modal (blijft ongewijzigd, alleen styling in modal zelf)
  $("modalMissed3").innerHTML = missed.missedTasks.length
    ? missed.missedTasks.map(t => `<div class="border-bottom pb-1 mb-1">• <span class="fw-semibold">${t.name}</span> <span class="text-muted">(${t.category})</span></div>`).join("")
    : `<div class="text-muted fst-italic">Geen gemiste taken.</div>`;

  $("modalWarnings3").innerHTML = warnings.items.map(i => `
    <div class="card mb-2 border-${i.status === 'CRITICAL' ? 'danger' : i.status === 'WARN' ? 'warning' : 'success'}">
      <div class="card-body p-2">
        <div class="d-flex justify-content-between">
          <span class="fw-semibold">${i.name}</span>
          <span class="badge ${badgeForStatus(i.status)}">${i.status}</span>
        </div>
        <div class="small text-muted">Voorraad: ${i.stockGrams}g · Gem./dag: ${i.avgDailyConsumedGrams}g · Dagen resterend: ${i.estimatedDaysRemaining ?? '—'}</div>
        <div class="small text-muted">Advies bestelling: ${i.suggestedOrderKg ?? '—'} kg</div>
        ${i.reorderRule ? `<div class="small mt-1 p-1 bg-light rounded">${i.reorderRule}</div>` : ""}
      </div>
    </div>
  `).join("");
}

async function loadSupervisorQueue(date) {
  try {
    const logs = await api(`/supervisor/logs?date=${date}&status=PENDING`);
    lastData.supQueue = logs;

    const wrap = $("supQueue3");
    wrap.className = "d-flex flex-column gap-2";
    wrap.innerHTML = logs.slice(0, 3).map(l => `
      <div class="card border-warning">
        <div class="card-body p-2">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <span class="fw-semibold">${l.task?.name || "Taak"}</span>
              <span class="badge bg-warning ms-2">PENDING</span>
            </div>
          </div>
          <div class="small text-muted mt-1">
            <i class="bi bi-person me-1"></i>${l.user?.name || l.user?.email || '—'} · 
            <i class="bi bi-cake me-1"></i>${l.quantityGrams ?? '—'}g
          </div>
          <div class="d-flex gap-2 mt-2">
            <button class="btn btn-sm btn-success" data-approve="${l.id}">
              <i class="bi bi-check-circle me-1"></i>Goedkeuren
            </button>
            <button class="btn btn-sm btn-outline-danger" data-reject="${l.id}">
              <i class="bi bi-x-circle me-1"></i>Afkeuren
            </button>
          </div>
        </div>
      </div>
    `).join("");

    wrap.querySelectorAll("button[data-approve]").forEach(btn => {
      btn.addEventListener("click", () => decideLog(btn.dataset.approve, "APPROVED"));
    });
    wrap.querySelectorAll("button[data-reject]").forEach(btn => {
      btn.addEventListener("click", () => decideLog(btn.dataset.reject, "REJECTED"));
    });
  } catch {
    $("supQueue3").innerHTML = `<div class="alert alert-secondary small mb-0"><i class="bi bi-info-circle me-1"></i>Supervisor endpoints niet beschikbaar voor deze rol.</div>`;
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

  await loadTasksToday(date);

  const view = getRoleView();
  if (view === "admin" || currentUser?.role === "ADMIN") {
    await loadAdminPanels(date);
  } else {
    $("kpiMissed3").innerHTML = '<span class="badge bg-secondary">—</span>';
    $("kpiAlerts3").innerHTML = '<span class="badge bg-secondary">—</span>';
    $("missedCount3").textContent = "—";
    $("warningsTable3").innerHTML = "";
    $("overviewTable3").innerHTML = "";
    $("overviewTotals3").innerHTML = "—";
  }

  if (view === "supervisor" || currentUser?.role === "SUPERVISOR" || currentUser?.role === "ADMIN") {
    await loadSupervisorQueue(date);
  } else {
    $("supQueue3").innerHTML = `<div class="alert alert-secondary small mb-0"><i class="bi bi-info-circle me-1"></i>Niet beschikbaar voor deze rol.</div>`;
  }

  // Dynamische paginatitel / subtitel (styling blijft via classes in HTML)
  const titles = {
    admin: { title: "Admin Dashboard", subtitle: "Overzicht, gemiste taken, voorraadwaarschuwingen en dagelijkse status." },
    supervisor: { title: "Supervisor Dashboard", subtitle: "Keur aanvragen goed of keur ze af." },
    caretaker: { title: "Caretaker Dashboard", subtitle: "Log dagelijkse taken snel en accuraat." }
  };
  const t = titles[view] || { title: "Dashboard", subtitle: "Professioneel backend-gekoppeld mockup." };
  $("pageTitle3").textContent = t.title;
  $("pageSubtitle3").textContent = t.subtitle;
}

// ==================== STYLING BOOTSTRAP (eenmalig) ====================
function applyBootstrapLayout() {
  // Globale datum input styling
  const dateInput = $("globalDate3");
  if (dateInput) {
    dateInput.classList.add("form-control", "form-control-sm", "w-auto", "d-inline-block");
  }

  // Rol view selector
  const roleView = $("roleView3");
  if (roleView) roleView.classList.add("form-select", "form-select-sm", "w-auto", "d-inline-block");

  // Refresh knop
  const refreshBtn = $("btnRefresh3");
  if (refreshBtn) refreshBtn.classList.add("btn", "btn-sm", "btn-outline-primary");

  // Wrap taken tabel in een card
  const tasksTbody = $("tasksTable3");
  if (tasksTbody) {
    const table = tasksTbody.closest("table");
    if (table && !table.closest(".card")) {
      const parent = table.parentNode;
      const card = document.createElement("div");
      card.className = "card mb-4 shadow-sm";
      const cardHeader = document.createElement("div");
      cardHeader.className = "card-header bg-light d-flex justify-content-between align-items-center";
      cardHeader.innerHTML = `<span><i class="bi bi-list-task me-2"></i><strong>Recente taken voor vandaag</strong></span>
                              <span id="tasksCount3" class="badge bg-primary rounded-pill">0 taken</span>`;
      const cardBody = document.createElement("div");
      cardBody.className = "card-body p-0";
      parent.replaceChild(card, table);
      card.appendChild(cardHeader);
      card.appendChild(cardBody);
      cardBody.appendChild(table);
      table.classList.add("table", "table-sm", "table-hover", "mb-0", "align-middle");
    }
  }

  // Admin secties als cards inrichten (worden dynamisch gevuld, maar containers klaarzetten)
  const adminSections = [
    { id: "kpiMissed3", title: "Gemiste taken", icon: "exclamation-triangle-fill" },
    { id: "warningsTable3", title: "Voorraadwaarschuwingen", icon: "exclamation-triangle" },
    { id: "overviewTable3", title: "Dagelijks overzicht", icon: "calendar-day" }
  ];

  adminSections.forEach(section => {
    let el = $(section.id);
    if (el && !el.closest(".card")) {
      // Voor warningsTable3: we vervangen het element later door een div, dus nu niet wrappen
      if (section.id === "warningsTable3" && el.tagName === "TBODY") return;
      const parent = el.parentNode;
      const card = document.createElement("div");
      card.className = "card mb-3 h-100";
      const cardHeader = document.createElement("div");
      cardHeader.className = "card-header bg-light py-2";
      cardHeader.innerHTML = `<i class="bi bi-${section.icon} me-2"></i><strong>${section.title}</strong>`;
      const cardBody = document.createElement("div");
      cardBody.className = "card-body p-2";
      parent.replaceChild(card, el);
      card.appendChild(cardHeader);
      card.appendChild(cardBody);
      cardBody.appendChild(el);
    }
  });

  // Supervisor queue als card
  const supQueue = $("supQueue3");
  if (supQueue && !supQueue.closest(".card")) {
    const parent = supQueue.parentNode;
    const card = document.createElement("div");
    card.className = "card mb-3";
    const cardHeader = document.createElement("div");
    cardHeader.className = "card-header bg-warning bg-opacity-25 py-2";
    cardHeader.innerHTML = `<i class="bi bi-hourglass-split me-2"></i><strong>Goedkeuring wachtrij</strong>`;
    const cardBody = document.createElement("div");
    cardBody.className = "card-body p-2";
    parent.replaceChild(card, supQueue);
    card.appendChild(cardHeader);
    card.appendChild(cardBody);
    cardBody.appendChild(supQueue);
  }

  // Extra KPI's (backend, completed) in badge-stijl plaatsen
  const kpiCompleted = $("kpiCompleted3");
  if (kpiCompleted) kpiCompleted.className = "badge bg-success ms-2";
  const kpiBackend = $("kpiBackend3");
  if (kpiBackend) kpiBackend.className = "badge";
}

document.addEventListener("DOMContentLoaded", async () => {
  $("globalDate3").value = isoToday();

  // Login form DEBUG (ongewijzigd gelaten, alleen styling classes toegevoegd)
  $("loginEmail3")?.classList.add("form-control");
  $("loginPassword3")?.classList.add("form-control");
  $("btnDemoFill3")?.classList.add("btn", "btn-sm", "btn-outline-secondary");
  $("loginForm3")?.querySelector("button[type=submit]")?.classList.add("btn", "btn-primary");

  $("loginForm3").addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("=== DEBUG LOGIN START ===");
    try {
      const email = $("loginEmail3").value.trim();
      const password = $("loginPassword3").value;
      console.log("1. Form values:", { email, password });
      console.log("2. API_BASE:", API_BASE);
      console.log("3. Full URL:", `${API_BASE}/auth/login`);
      
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      
      console.log("4. Response status:", res.status, res.statusText);
      console.log("5. Response headers:");
      for (const [key, value] of res.headers.entries()) {
        console.log(`   ${key}: ${value}`);
      }
      
      const responseText = await res.text();
      console.log("6. Raw response text:", responseText);
      
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

  $("btnOpenDetails3").addEventListener("click", () => {
    const modal = new bootstrap.Modal(document.getElementById("detailsModal3"));
    modal.show();
  });

  // Eerste styling aanbrengen
  applyBootstrapLayout();
  await loadMe();
});