// js/dashboard-core.js
import { $, api, setAlert, token } from "./api.js";
import { state, setCurrentUser } from "./state.js";
import { badgeForStatus, getRoleView, updateRoleSpecificUI } from "./ui-roles.js";

export async function loadMe() {
  if (!token()) {
    console.log("Geen token gevonden, gebruiker blijft uitgelogd");
    setCurrentUser(null);
    $("roleBadge3").innerHTML = '<span class="badge bg-secondary">Not logged in</span>';
    $("btnLogout3").classList.add("d-none");
    $("viewLogin3").classList.remove("d-none");
    $("viewApp3").classList.add("d-none");
    return;
  }

  try {
    const me = await api("/auth/me");
    setCurrentUser(me);

    $("roleBadge3").innerHTML = `<span class="badge bg-${
      me.role === "ADMIN" ? "danger" : me.role === "SUPERVISOR" ? "warning" : "info"
    }">${me.role}</span>`;

    $("btnLogout3").classList.remove("d-none");
    $("viewLogin3").classList.add("d-none");
    $("viewApp3").classList.remove("d-none");
    await refreshAll();
  } catch (err) {
    console.error("Auth/me failed:", err);
    localStorage.removeItem("token");
    setCurrentUser(null);
    $("roleBadge3").innerHTML = '<span class="badge bg-secondary">Not logged in</span>';
    $("btnLogout3").classList.add("d-none");
    $("viewLogin3").classList.remove("d-none");
    $("viewApp3").classList.add("d-none");
  }
}

export async function checkBackend() {
  try {
    await api("/health");
    $("kpiBackend3").innerHTML = '<span class="badge bg-success">Online</span>';
  } catch {
    $("kpiBackend3").innerHTML = '<span class="badge bg-danger">Offline</span>';
  }
}

export async function loadTasksToday(date) {
  const data = await api(`/tasks/today?date=${date}`);
  state.lastData.tasksToday = data;

  const tasks = data.tasks || [];
  $("tasksCount3").textContent = `${tasks.length} taken`;

  const done = tasks.filter((t) => t.logged && t.completed).length;
  $("kpiCompleted3").innerHTML = `<span class="badge bg-success">${done}/${tasks.length} voltooid</span>`;

  const tbody = $("tasksTable3");
  tbody.innerHTML = "";

  tasks.forEach((t) => {
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
          <button class="btn btn-sm btn-${disabled ? "secondary" : "primary"}" ${
            disabled ? "disabled" : ""
          } data-log="${t.taskId}">
            <i class="bi bi-check-circle me-1"></i>Log
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });

  tbody.querySelectorAll("button[data-log]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const taskId = Number(btn.dataset.log);
      const date = $("globalDate3").value;
      const qtyVal = $(`qty3_${taskId}`).value;
      const qty = qtyVal ? Number(qtyVal) : null;

      try {
        await api("/daily-logs", {
          method: "POST",
          json: { date, taskId, completed: true, quantityGrams: Number.isFinite(qty) ? qty : null, notes: "" },
        });
        setAlert("success", "Task logged.");
        await refreshAll();
      } catch (e) {
        setAlert("danger", e.message);
      }
    });
  });
}

export async function loadAdminPanels(date) {
  const [missed, warnings, overview] = await Promise.all([
    api(`/admin/missed-tasks?date=${date}`),
    api(`/admin/inventory-warnings?lookbackDays=14&warnDays=21&criticalDays=7`),
    api(`/admin/daily-overview?date=${date}`),
  ]);

  state.lastData.missed = missed;
  state.lastData.warnings = warnings;
  state.lastData.overview = overview;

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

  const alerts = warnings.items.filter((i) => i.status === "WARN" || i.status === "CRITICAL").length;
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
  warningsContainer.innerHTML = warnings.items
    .slice(0, 6)
    .map(
      (i) => `
    <div class="alert alert-${
      i.status === "CRITICAL" ? "danger" : i.status === "WARN" ? "warning" : "success"
    } d-flex align-items-center mb-0 p-2">
      <i class="bi bi-${
        i.status === "CRITICAL" ? "exclamation-triangle-fill" : i.status === "WARN" ? "exclamation-triangle" : "check-circle-fill"
      } me-2"></i>
      <div class="flex-grow-1">
        <strong>${i.name}</strong><br>
        <small>Voorraad: ${i.stockGrams}g · Gem. verbruik: ${i.avgDailyConsumedGrams}g/dag · Dagen over: ${
        i.estimatedDaysRemaining ?? "—"
      }</small>
      </div>
      <span class="badge ${badgeForStatus(i.status)}">${i.status}</span>
    </div>
  `
    )
    .join("");

  $("overviewTotals3").innerHTML = `
    <span class="badge bg-secondary">Totaal: ${overview.totals?.tasksTotal}</span>
    <span class="badge bg-success">Voltooid: ${overview.totals?.completed}</span>
    <span class="badge bg-danger">Missing: ${overview.totals?.missing}</span>
    <span class="badge bg-warning">Incompleet: ${overview.totals?.incomplete}</span>
  `;

  const ot = $("overviewTable3");
  ot.innerHTML = "";
  overview.tasks.forEach((t) => {
    const badgeClass = t.status === "missing" ? "text-bg-danger" : t.status === "incomplete" ? "text-bg-warning" : "text-bg-success";
    const loggedBy = (t.logs || []).map((l) => l.user?.name).filter(Boolean).join(", ");
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${t.taskName}</td>
      <td><span class="badge ${badgeClass}">${t.status}</span> ${t.warning ? "❗" : ""}</td>
      <td>${loggedBy || '<span class="text-muted">—</span>'}</td>
    `;
    ot.appendChild(row);
  });

  $("modalMissed3").innerHTML = missed.missedTasks.length
    ? missed.missedTasks.map((t) => `<div class="border-bottom pb-1 mb-1">• <span class="fw-semibold">${t.name}</span> <span class="text-muted">(${t.category})</span></div>`).join("")
    : `<div class="text-muted fst-italic">Geen gemiste taken.</div>`;

  $("modalWarnings3").innerHTML = warnings.items
    .map(
      (i) => `
    <div class="card mb-2 border-${i.status === "CRITICAL" ? "danger" : i.status === "WARN" ? "warning" : "success"}">
      <div class="card-body p-2">
        <div class="d-flex justify-content-between">
          <span class="fw-semibold">${i.name}</span>
          <span class="badge ${badgeForStatus(i.status)}">${i.status}</span>
        </div>
        <div class="small text-muted">Voorraad: ${i.stockGrams}g · Gem./dag: ${i.avgDailyConsumedGrams}g · Dagen resterend: ${i.estimatedDaysRemaining ?? "—"}</div>
        <div class="small text-muted">Advies bestelling: ${i.suggestedOrderKg ?? "—"} kg</div>
        ${i.reorderRule ? `<div class="small mt-1 p-1 bg-light rounded">${i.reorderRule}</div>` : ""}
      </div>
    </div>
  `
    )
    .join("");
}

export async function loadSupervisorQueue(date) {
  try {
    const logs = await api(`/supervisor/logs?date=${date}&status=PENDING`);
    state.lastData.supQueue = logs;

    const wrap = $("supQueue3");
    wrap.className = "d-flex flex-column gap-2";
    wrap.innerHTML = logs
      .slice(0, 3)
      .map(
        (l) => `
      <div class="card border-warning">
        <div class="card-body p-2">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <span class="fw-semibold">${l.task?.name || "Taak"}</span>
              <span class="badge bg-warning ms-2">PENDING</span>
            </div>
          </div>
          <div class="small text-muted mt-1">
            <i class="bi bi-person me-1"></i>${l.user?.name || l.user?.email || "—"} · 
            <i class="bi bi-cake me-1"></i>${l.quantityGrams ?? "—"}g
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
    `
      )
      .join("");

    wrap.querySelectorAll("button[data-approve]").forEach((btn) => {
      btn.addEventListener("click", () => decideLog(btn.dataset.approve, "APPROVED"));
    });
    wrap.querySelectorAll("button[data-reject]").forEach((btn) => {
      btn.addEventListener("click", () => decideLog(btn.dataset.reject, "REJECTED"));
    });
  } catch {
    $("supQueue3").innerHTML = `<div class="alert alert-secondary small mb-0"><i class="bi bi-info-circle me-1"></i>Supervisor endpoints niet beschikbaar voor deze rol.</div>`;
  }
}

export async function decideLog(id, approvalStatus) {
  try {
    await api(`/supervisor/logs/${id}`, {
      method: "PATCH",
      json: {
        approvalStatus,
        supervisorNote: approvalStatus === "REJECTED" ? "Please correct and resubmit." : "Checked and confirmed.",
      },
    });
    setAlert("success", `Log #${id} ${approvalStatus}`);
    await refreshAll();
  } catch (e) {
    setAlert("danger", e.message);
  }
}

export async function refreshAll() {
  const date = $("globalDate3").value;
  await checkBackend();
  await loadTasksToday(date);

  const view = getRoleView();

  if (view === "admin" || state.currentUser?.role === "ADMIN") {
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

  if (view === "supervisor" || state.currentUser?.role === "SUPERVISOR" || state.currentUser?.role === "ADMIN") {
    await loadSupervisorQueue(date);
  } else {
    $("supQueue3").innerHTML = `<div class="alert alert-secondary small mb-0"><i class="bi bi-info-circle me-1"></i>Niet beschikbaar voor deze rol.</div>`;
  }

  const titles = {
    admin: { title: "Admin Dashboard", subtitle: "Overzicht, gemiste taken, voorraadwaarschuwingen en dagelijkse status." },
    supervisor: { title: "Supervisor Dashboard", subtitle: "Keur aanvragen goed of keur ze af." },
    caretaker: { title: "Caretaker Dashboard", subtitle: "Log dagelijkse taken snel en accuraat." },
  };
  const t = titles[view] || { title: "Dashboard", subtitle: "Professioneel backend-gekoppeld mockup." };
  $("pageTitle3").textContent = t.title;
  $("pageSubtitle3").textContent = t.subtitle;

  updateRoleSpecificUI(view);
}
