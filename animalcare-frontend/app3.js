const API_BASE = "http://localhost:3001";
function $(id) { return document.getElementById(id); }

function setAlert(type, msg) {
  const box = $("alertBox3");
  box.className = `alert alert-${type} d-flex align-items-center`;
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

// ==================== ORIGINELE FUNCTIES (ONVERANDERD) ====================
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

  // Missed tasks KPI
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

  // Inventory warnings
  const alerts = warnings.items.filter(i => i.status === "WARN" || i.status === "CRITICAL").length;
  $("kpiAlerts3").innerHTML = `<span class="badge bg-warning">${alerts} waarschuwingen</span>`;

  let warningsContainer = $("warningsTable3");
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

  // Daily overview
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

  // Modal details
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
    $("adminSpecificUI")?.classList.remove("d-none");
  } else {
    $("kpiMissed3").innerHTML = '<span class="badge bg-secondary">—</span>';
    $("kpiAlerts3").innerHTML = '<span class="badge bg-secondary">—</span>';
    $("missedCount3").textContent = "—";
    $("warningsTable3").innerHTML = "";
    $("overviewTable3").innerHTML = "";
    $("overviewTotals3").innerHTML = "—";
    $("adminSpecificUI")?.classList.add("d-none");
  }

  if (view === "supervisor" || currentUser?.role === "SUPERVISOR" || currentUser?.role === "ADMIN") {
    await loadSupervisorQueue(date);
  } else {
    $("supQueue3").innerHTML = `<div class="alert alert-secondary small mb-0"><i class="bi bi-info-circle me-1"></i>Niet beschikbaar voor deze rol.</div>`;
  }

  // Update page header
  const titles = {
    admin: { title: "Admin Dashboard", subtitle: "Overzicht, gemiste taken, voorraadwaarschuwingen en dagelijkse status." },
    supervisor: { title: "Supervisor Dashboard", subtitle: "Keur aanvragen goed of keur ze af." },
    caretaker: { title: "Caretaker Dashboard", subtitle: "Log dagelijkse taken snel en accuraat." }
  };
  const t = titles[view] || { title: "Dashboard", subtitle: "Professioneel backend-gekoppeld mockup." };
  $("pageTitle3").textContent = t.title;
  $("pageSubtitle3").textContent = t.subtitle;

  // Toon/verberg role-specific UI (toegevoegd in injectMissingUI)
  updateRoleSpecificUI(view);
}

// ==================== NIEUW: FRONTEND-FEATURES UIT JOUW PHP-DASHBOARDS ====================
// Geen backend, alleen UI met dummy‑data en alerts.

function injectMissingUI() {
  if ($("viewApp3").querySelector("#injectedUIMarker")) return; // al toegevoegd

  // 1. Row voor extra stat cards (admin & caretaker)
  const statRow = document.createElement("div");
  statRow.id = "extraStatCards";
  statRow.className = "row mb-4";
  statRow.innerHTML = `
    <div class="col-md-3 mb-3 admin-only caretaker-only">
      <div class="card text-white bg-primary h-100">
        <div class="card-body d-flex justify-content-between align-items-center p-3">
          <div>
            <h6 class="card-title mb-0">Actieve gebruikers</h6>
            <span class="fs-3 fw-bold">8/12</span>
          </div>
          <i class="bi bi-people fs-1"></i>
        </div>
      </div>
    </div>
    <div class="col-md-3 mb-3 admin-only caretaker-only">
      <div class="card text-white bg-success h-100">
        <div class="card-body d-flex justify-content-between align-items-center p-3">
          <div>
            <h6 class="card-title mb-0">Voltooide taken</h6>
            <span class="fs-3 fw-bold">64%</span>
          </div>
          <i class="bi bi-check-circle fs-1"></i>
        </div>
      </div>
    </div>
    <div class="col-md-3 mb-3 admin-only">
      <div class="card text-white bg-warning h-100">
        <div class="card-body d-flex justify-content-between align-items-center p-3">
          <div>
            <h6 class="card-title mb-0">Waarschuwingen</h6>
            <span class="fs-3 fw-bold">7</span>
          </div>
          <i class="bi bi-exclamation-triangle fs-1"></i>
        </div>
      </div>
    </div>
    <div class="col-md-3 mb-3 admin-only">
      <div class="card text-white bg-info h-100">
        <div class="card-body d-flex justify-content-between align-items-center p-3">
          <div>
            <h6 class="card-title mb-0">Voorraad niveau</h6>
            <span class="fs-3 fw-bold">42%</span>
          </div>
          <i class="bi bi-box-seam fs-1"></i>
        </div>
      </div>
    </div>
  `;
  $("viewApp3").insertBefore(statRow, $("viewApp3").firstChild.nextSibling);

  // 2. Admin instructies / belangrijke mededelingen (alleen caretaker/supervisor)
  const adminInstr = document.createElement("div");
  adminInstr.id = "adminInstructionsCard";
  adminInstr.className = "card mb-4 supervisor-only caretaker-only";
  adminInstr.innerHTML = `
    <div class="card-header bg-info text-white">
      <h5 class="mb-0"><i class="bi bi-megaphone me-2"></i>Admin instructies</h5>
    </div>
    <div class="card-body">
      <div class="alert alert-info mb-2">
        <h6><i class="bi bi-info-circle me-1"></i> Belangrijk voor vandaag:</h6>
        <p class="small mb-0">Let extra op het gedrag van de varkens na het voeren. Meld eventuele afwijkingen direct in observaties.</p>
      </div>
      <div class="alert alert-warning mb-2">
        <h6><i class="bi bi-exclamation-triangle me-1"></i> Wijziging voerhoeveelheid:</h6>
        <p class="small mb-0">Vanaf morgen: varkensvoer verminderd naar 600g per dier i.p.v. 700g.</p>
      </div>
      <div class="alert alert-light border mb-0">
        <h6><i class="bi bi-calendar-event me-1"></i> Geplande activiteit:</h6>
        <p class="small mb-0">Dierenarts bezoekt morgen om 14:00 voor routinecontrole.</p>
      </div>
    </div>
  `;
  $("viewApp3").appendChild(adminInstr);

  // 3. Snelle acties card (caretaker)
  const quickActions = document.createElement("div");
  quickActions.id = "quickActionsCard";
  quickActions.className = "card mb-4 caretaker-only";
  quickActions.innerHTML = `
    <div class="card-header">
      <h5 class="mb-0"><i class="bi bi-lightning me-2"></i>Snelle acties</h5>
    </div>
    <div class="card-body">
      <div class="d-grid gap-2">
        <button class="btn btn-outline-primary" data-bs-toggle="modal" data-bs-target="#quickLogModal">
          <i class="bi bi-plus-circle me-2"></i>Snelle log toevoegen
        </button>
        <button class="btn btn-outline-success" onclick="setAlert('info', 'Observatie melden (dummy)')">
          <i class="bi bi-eye me-2"></i>Observatie melden
        </button>
        <button class="btn btn-outline-warning" onclick="setAlert('info', 'Voorraad bijwerken (dummy)')">
          <i class="bi bi-box-arrow-down me-2"></i>Voorraad bijwerken
        </button>
        <button class="btn btn-outline-info" data-bs-toggle="modal" data-bs-target="#photoUploadModal">
          <i class="bi bi-camera me-2"></i>Foto uploaden
        </button>
      </div>
    </div>
  `;
  $("viewApp3").appendChild(quickActions);

  // 4. Recente activiteit tabel (caretaker)
  const recentActivity = document.createElement("div");
  recentActivity.id = "recentActivityCard";
  recentActivity.className = "card mt-4 caretaker-only";
  recentActivity.innerHTML = `
    <div class="card-header">
      <h5 class="mb-0"><i class="bi bi-clock-history me-2"></i>Recente activiteit</h5>
    </div>
    <div class="card-body">
      <div class="table-responsive">
        <table class="table table-hover table-sm">
          <thead>
            <tr><th>Tijd</th><th>Actie</th><th>Uitgevoerd door</th><th>Details</th></tr>
          </thead>
          <tbody>
            <tr><td>09:15</td><td><span class="badge bg-success">Taak voltooid</span></td><td>Jan Jansen</td><td>Kippenhok schoonmaken</td></tr>
            <tr><td>08:45</td><td><span class="badge bg-info">Observatie</span></td><td>Piet Pietersen</td><td>Varken #3 lijkt minder actief</td></tr>
            <tr><td>08:30</td><td><span class="badge bg-primary">Voorraad</span></td><td>Admin</td><td>Konijnenvoer bijgevuld (+25kg)</td></tr>
            <tr><td>Gisteren 16:20</td><td><span class="badge bg-warning">Waarschuwing</span></td><td>Systeem</td><td>Varkens niet gevoerd na 17:00</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
  $("viewApp3").appendChild(recentActivity);

  // 5. Admin extra: systeem instellingen & recente observaties
  const adminExtras = document.createElement("div");
  adminExtras.id = "adminExtras";
  adminExtras.className = "row mt-4 admin-only";
  adminExtras.innerHTML = `
    <div class="col-lg-4">
      <div class="card mb-4">
        <div class="card-header bg-primary text-white">
          <h5 class="mb-0"><i class="bi bi-gear me-2"></i>Systeem instellingen</h5>
        </div>
        <div class="card-body p-0">
          <div class="list-group list-group-flush">
            <a href="#" class="list-group-item list-group-item-action" onclick="setAlert('info', 'Alarminstellingen (dummy)'); return false;">Alarminstellingen</a>
            <a href="#" class="list-group-item list-group-item-action" onclick="setAlert('info', 'Gebruikersbeheer (dummy)'); return false;">Gebruikersbeheer</a>
            <a href="#" class="list-group-item list-group-item-action" onclick="setAlert('info', 'Voerhoeveelheden (dummy)'); return false;">Voerhoeveelheden</a>
            <a href="#" class="list-group-item list-group-item-action" onclick="setAlert('info', 'Email instellingen (dummy)'); return false;">Email instellingen</a>
          </div>
        </div>
      </div>
    </div>
    <div class="col-lg-8">
      <div class="card">
        <div class="card-header">
          <h5 class="mb-0"><i class="bi bi-eye me-2"></i>Recente observaties</h5>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6 mb-3">
              <div class="card border">
                <div class="card-body p-3">
                  <h6>Varken #3 minder actief</h6>
                  <p class="small mb-2">Varken #3 lijkt minder actief dan normaal.</p>
                  <div class="d-flex justify-content-between">
                    <small class="text-muted">Piet Pietersen - 08:45</small>
                    <button class="btn btn-sm btn-outline-info" onclick="setAlert('info', 'Behandel melding (dummy)')">Behandel</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-6 mb-3">
              <div class="card border">
                <div class="card-body p-3">
                  <h6>Kip met kale plek</h6>
                  <p class="small mb-2">Kip in hok B heeft kale plek op rug.</p>
                  <div class="d-flex justify-content-between">
                    <small class="text-muted">Jan Jansen - Gisteren</small>
                    <button class="btn btn-sm btn-outline-success" onclick="setAlert('success', 'Afgerond (dummy)')">Afgerond</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  $("viewApp3").appendChild(adminExtras);

  // 6. Modals (Quick Log, Photo Upload, Send Summary, System Report)
  const modalHTML = `
    <!-- Quick Log Modal -->
    <div class="modal fade" id="quickLogModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-plus-circle me-2"></i>Snelle log toevoegen</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="quickLogForm">
              <div class="mb-3">
                <label class="form-label">Taak</label>
                <select class="form-select" id="quickLogTask">
                  <option>Varkens voeren</option>
                  <option>Kippenhok schoonmaken</option>
                  <option>Konijnen voeren</option>
                  <option>Dieren observatie</option>
                  <option>Stallen controleren</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label">Hoeveelheid (gram)</label>
                <input type="number" class="form-control" id="quickLogQuantity" placeholder="3500">
              </div>
              <div class="mb-3">
                <label class="form-label">Opmerkingen</label>
                <textarea class="form-control" rows="2" id="quickLogNotes" placeholder="Optioneel"></textarea>
              </div>
              <div class="form-check mb-3">
                <input type="checkbox" class="form-check-input" id="quickLogPhoto">
                <label class="form-check-label" for="quickLogPhoto">Foto toevoegen</label>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
            <button type="button" class="btn btn-primary" id="submitQuickLog">Log toevoegen</button>
          </div>
        </div>
      </div>
    </div>
    <!-- Photo Upload Modal -->
    <div class="modal fade" id="photoUploadModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-camera me-2"></i>Foto uploaden</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="photoUploadForm">
              <div class="mb-3">
                <label class="form-label">Beschrijving</label>
                <input type="text" class="form-control" id="photoDescription" placeholder="Wat zien we op de foto?">
              </div>
              <div class="mb-3">
                <label class="form-label">Dier / Locatie</label>
                <select class="form-select" id="photoAnimal">
                  <option>Varkens</option>
                  <option>Kippen</option>
                  <option>Konijnen</option>
                  <option>Algemeen</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label">Foto selecteren</label>
                <input class="form-control" type="file" accept="image/*">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
            <button type="button" class="btn btn-primary" id="submitPhotoUpload">Uploaden</button>
          </div>
        </div>
      </div>
    </div>
    <!-- Send Summary Modal (Admin) -->
    <div class="modal fade" id="sendSummaryModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-envelope me-2"></i>Log samenvatting versturen</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form>
              <div class="mb-3">
                <label class="form-label">Ontvangers</label>
                <input type="email" class="form-control" value="admin@dierenzorg.nl">
              </div>
              <div class="mb-3">
                <label class="form-label">Periode</label>
                <select class="form-select">
                  <option>Vandaag</option>
                  <option>Afgelopen week</option>
                </select>
              </div>
              <div class="form-check">
                <input type="checkbox" class="form-check-input" id="autoSend">
                <label class="form-check-label" for="autoSend">Dagelijks automatisch versturen</label>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
            <button type="button" class="btn btn-primary" onclick="setAlert('success', 'Samenvatting verstuurd! (dummy)'); bootstrap.Modal.getInstance(document.getElementById('sendSummaryModal')).hide();">Versturen</button>
          </div>
        </div>
      </div>
    </div>
    <!-- System Report Modal (Admin) -->
    <div class="modal fade" id="systemReportModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-file-text me-2"></i>Systeemrapport</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form>
              <div class="mb-3">
                <label class="form-label">Rapport type</label>
                <select class="form-select">
                  <option>Maandrapport</option>
                  <option>Weekrapport</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label">Periode</label>
                <div class="row">
                  <div class="col-md-6">
                    <input type="date" class="form-control" value="${isoToday()}">
                  </div>
                  <div class="col-md-6">
                    <input type="date" class="form-control" value="${isoToday()}">
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
            <button type="button" class="btn btn-primary" onclick="setAlert('success', 'Rapport gegenereerd! (dummy)'); bootstrap.Modal.getInstance(document.getElementById('systemReportModal')).hide();">Genereren</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Marker om dubbele injectie te voorkomen
  const marker = document.createElement("div");
  marker.id = "injectedUIMarker";
  marker.style.display = "none";
  $("viewApp3").appendChild(marker);

  // Event listeners voor nieuwe modals
  $("submitQuickLog")?.addEventListener("click", function() {
    setAlert("success", "Snelle log toegevoegd! (dummy)");
    bootstrap.Modal.getInstance($("quickLogModal")).hide();
  });
  $("submitPhotoUpload")?.addEventListener("click", function() {
    setAlert("success", "Foto geüpload! (dummy)");
    bootstrap.Modal.getInstance($("photoUploadModal")).hide();
  });

  // Voeg admin-knop toe als die nog niet bestaat (voor sendSummaryModal)
  if (!$("btnSendSummary3")) {
    const adminToolbar = document.querySelector("#viewApp3 .btn-toolbar");
    if (adminToolbar) {
      const summaryBtn = document.createElement("button");
      summaryBtn.id = "btnSendSummary3";
      summaryBtn.type = "button";
      summaryBtn.className = "btn btn-sm btn-primary ms-2";
      summaryBtn.setAttribute("data-bs-toggle", "modal");
      summaryBtn.setAttribute("data-bs-target", "#sendSummaryModal");
      summaryBtn.innerHTML = '<i class="bi bi-envelope me-1"></i>Log samenvatting';
      adminToolbar.appendChild(summaryBtn);
    }
  }
}

function updateRoleSpecificUI(view) {
  // Toon/verberg elementen op basis van role
  const adminOnly = document.querySelectorAll(".admin-only");
  const supervisorOnly = document.querySelectorAll(".supervisor-only");
  const caretakerOnly = document.querySelectorAll(".caretaker-only");

  adminOnly.forEach(el => el.style.display = view === "admin" ? "block" : "none");
  supervisorOnly.forEach(el => el.style.display = view === "supervisor" ? "block" : "none");
  caretakerOnly.forEach(el => el.style.display = view === "caretaker" ? "block" : "none");

  // Extra: specifieke containers voor admin
  const adminExtras = $("adminExtras");
  if (adminExtras) adminExtras.style.display = view === "admin" ? "flex" : "none";
  const adminInstructions = $("adminInstructionsCard");
  if (adminInstructions) adminInstructions.style.display = (view === "caretaker" || view === "supervisor") ? "block" : "none";
}

// ==================== STYLING BOOTSTRAP (EENMALIG) ====================
function applyBootstrapLayout() {
  $("globalDate3")?.classList.add("form-control", "form-control-sm", "w-auto", "d-inline-block");
  $("roleView3")?.classList.add("form-select", "form-select-sm", "w-auto", "d-inline-block");
  $("btnRefresh3")?.classList.add("btn", "btn-sm", "btn-outline-primary");

  // Taken tabel in card wrappen
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

  // Admin panels wrappen
  const adminSections = [
    { id: "kpiMissed3", title: "Gemiste taken", icon: "exclamation-triangle-fill" },
    { id: "warningsTable3", title: "Voorraadwaarschuwingen", icon: "exclamation-triangle" },
    { id: "overviewTable3", title: "Dagelijks overzicht", icon: "calendar-day" }
  ];
  adminSections.forEach(section => {
    let el = $(section.id);
    if (el && !el.closest(".card") && section.id !== "warningsTable3") {
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

  // Supervisor queue card
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
}

// ==================== INIT ====================
document.addEventListener("DOMContentLoaded", async () => {
  $("globalDate3").value = isoToday();

  // Styling classes voor login
  $("loginEmail3")?.classList.add("form-control");
  $("loginPassword3")?.classList.add("form-control");
  $("btnDemoFill3")?.classList.add("btn", "btn-sm", "btn-outline-secondary");
  $("loginForm3")?.querySelector("button[type=submit]")?.classList.add("btn", "btn-primary");

  // LOGIN - originele werkende versie
  $("loginForm3").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const email = $("loginEmail3").value.trim();
      const password = $("loginPassword3").value;
      const res = await api("/auth/login", {
        method: "POST",
        json: { email, password }
      });
      localStorage.setItem("token", res.token);
      setAlert("success", "Logged in.");
      await loadMe();
    } catch (err) {
      setAlert("danger", err.message);
    }
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

  // Voeg de ontbrekende UI-componenten toe (jouw PHP-features)
  injectMissingUI();
  applyBootstrapLayout();
  await loadMe();
});