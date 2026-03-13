import { isoToday, api } from "./api.js";
import { state } from "./state.js";

function $(id) {
  return document.getElementById(id);
}

function setAlert(type, msg) {
  const box = $("alertBox3");
  if (!box) return;
  box.className = `alert alert-${type}`;
  box.textContent = msg;
  box.classList.remove("d-none");
  setTimeout(() => box.classList.add("d-none"), 4000);
}

function setRoleBadge() {
  const badge = $("userRoleBadge");
  if (!badge) return;

  if (!state.currentUser) {
    badge.innerHTML = `<span class="badge bg-secondary">Not logged in</span>`;
    return;
  }

  const role = state.currentUser.role;
  const cls = role === "ADMIN" ? "danger" : role === "SUPERVISOR" ? "warning" : "info";
  badge.innerHTML = `<span class="badge bg-${cls}">${role}</span>`;
}

function applyRoleVisibility() {
  const role = state.currentUser?.role;

  document.querySelectorAll(".admin-only,.supervisor-only,.caretaker-only").forEach(el => {
    el.classList.add("d-none");
  });

  if (!role) return;

  if (role === "ADMIN") {
    document.querySelectorAll(".admin-only,.supervisor-only,.caretaker-only").forEach(el => {
      el.classList.remove("d-none");
    });
    return;
  }

  if (role === "SUPERVISOR") {
    document.querySelectorAll(".supervisor-only,.caretaker-only").forEach(el => {
      el.classList.remove("d-none");
    });
    return;
  }

  document.querySelectorAll(".caretaker-only").forEach(el => {
    el.classList.remove("d-none");
  });
}

async function loadTasks(date) {
  const data = await api(`/tasks/today?date=${date}`);
  const tasks = data.tasks || [];

  const tbody = $("tasksTable3");
  if (!tbody) return;

  tbody.innerHTML = "";

  tasks.forEach((t) => {
    const status = t.logged
      ? (t.completed ? "Logged" : "Logged (incomplete)")
      : "Not logged";

    const badgeClass = t.logged && t.completed
      ? "text-bg-success"
      : t.logged
      ? "text-bg-warning"
      : "text-bg-secondary";

    const row = document.createElement("tr");
    row.style.cursor = "pointer";
    row.addEventListener("click", () => {
    const button = row.querySelector("[data-open-log]");
    if (button) button.click();
    });

    row.innerHTML = `
      <td><span class="fw-semibold">${t.taskName}</span></td>
      <td><span class="badge bg-light text-dark border">${t.category || ""}</span></td>
      <td>
        <button
          type="button"
          class="btn btn-sm ${t.logged ? "btn-outline-dark" : "btn-outline-primary"}"
          data-open-log='${JSON.stringify({
            taskId: t.taskId,
            taskName: t.taskName,
            logId: t.logId,
            quantityGrams: t.quantityGrams,
            notes: t.notes,
            completed: t.completed,
            logged: t.logged
          }).replace(/'/g, "&apos;")}'>
          <span class="badge ${badgeClass}">${status}</span>
        </button>
      </td>
      <td>
        <button
          type="button"
          class="btn btn-sm btn-primary"
          data-open-log='${JSON.stringify({
            taskId: t.taskId,
            taskName: t.taskName,
            logId: t.logId,
            quantityGrams: t.quantityGrams,
            notes: t.notes,
            completed: t.completed,
            logged: t.logged
          }).replace(/'/g, "&apos;")}'>
          ${t.logged ? "Edit log" : "Add log"}
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });

  tbody.querySelectorAll("[data-open-log]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();

    const raw = btn.getAttribute("data-open-log");
    const item = JSON.parse(raw);

    if ($("logTaskName3")) $("logTaskName3").value = item.taskName || "";
    if ($("logTaskId3")) $("logTaskId3").value = item.taskId || "";
    if ($("logId3")) $("logId3").value = item.logId || "";
    if ($("logQty3")) $("logQty3").value = item.quantityGrams ?? "";
    if ($("logNotes3")) $("logNotes3").value = item.notes ?? "";
    if ($("logCompleted3")) $("logCompleted3").checked = item.logged ? Boolean(item.completed) : true;

    const modalEl = $("logModal3");
    if (!modalEl || !window.bootstrap) {
      setAlert("danger", "Log modal is not available.");
      return;
    }

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  });
});
}

async function saveLogFromModal() {
  const date = $("globalDate3")?.value || isoToday();
  const taskId = Number($("logTaskId3")?.value);
  const logId = $("logId3")?.value ? Number($("logId3").value) : null;
  const qtyRaw = $("logQty3")?.value?.trim() || "";
  const notes = $("logNotes3")?.value?.trim() || "";
  const completed = Boolean($("logCompleted3")?.checked);

  if (!taskId) {
    setAlert("danger", "Task ID is missing.");
    return;
  }

  let quantityGrams = null;
  if (qtyRaw !== "") {
    quantityGrams = Number(qtyRaw);
    if (!Number.isFinite(quantityGrams) || quantityGrams < 0) {
      setAlert("danger", "Quantity must be a valid positive number.");
      return;
    }
  }

  if (logId) {
    await api(`/daily-logs/${logId}`, {
      method: "PATCH",
      json: {
        completed,
        quantityGrams,
        notes
      }
    });
    setAlert("success", "Log updated.");
  } else {
    await api("/daily-logs", {
      method: "POST",
      json: {
        date,
        taskId,
        completed,
        quantityGrams,
        notes
      }
    });
    setAlert("success", "Log created.");
  }

  const modalEl = $("logModal3");
  if (modalEl && window.bootstrap) {
    bootstrap.Modal.getOrCreateInstance(modalEl).hide();
  }

  await refreshTasksPage();
}

async function loadSupervisorQueue(date) {
  const wrap = $("supQueue3");
  const kpi = $("supPendingCount3");
  if (!wrap) return;

  try {
    const logs = await api(`/supervisor/logs?date=${date}&status=PENDING`);

    if (kpi) kpi.textContent = String(logs.length);

    const top = (logs || []).slice(0, 10);

    wrap.innerHTML = top.length
      ? top.map((l) => `
        <div class="card border-warning mb-2">
          <div class="card-body p-2">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <span class="fw-semibold">${l.task?.name || "Task"}</span>
                <span class="badge bg-warning ms-2">PENDING</span>
              </div>
              <small class="text-muted">#${l.id}</small>
            </div>

            <div class="small text-muted mt-1">
              <i class="bi bi-person me-1"></i>${l.user?.name || l.user?.email || "—"} ·
              <i class="bi bi-box me-1"></i>${l.quantityGrams ?? "—"}g
            </div>

            ${l.notes ? `<div class="small mt-1">${l.notes}</div>` : ""}

            <div class="d-flex gap-2 mt-2">
              <button class="btn btn-sm btn-success" data-approve="${l.id}">
                Approve
              </button>
              <button class="btn btn-sm btn-outline-danger" data-reject="${l.id}">
                Reject
              </button>
            </div>
          </div>
        </div>
      `).join("")
      : `<div class="alert alert-secondary small mb-0">
          No pending logs for this date.
        </div>`;

    wrap.querySelectorAll("[data-approve]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-approve");
        try {
          await api(`/supervisor/logs/${id}`, {
            method: "PATCH",
            json: {
              approvalStatus: "APPROVED",
              supervisorNote: "Checked and confirmed."
            }
          });
          setAlert("success", `Log #${id} approved.`);
          await refreshTasksPage();
        } catch (e) {
          setAlert("danger", e.message);
        }
      });
    });

    wrap.querySelectorAll("[data-reject]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-reject");
        try {
          await api(`/supervisor/logs/${id}`, {
            method: "PATCH",
            json: {
              approvalStatus: "REJECTED",
              supervisorNote: "Please correct and resubmit."
            }
          });
          setAlert("warning", `Log #${id} rejected.`);
          await refreshTasksPage();
        } catch (e) {
          setAlert("danger", e.message);
        }
      });
    });

  } catch (e) {
    if (kpi) kpi.textContent = "—";
    wrap.innerHTML = `<div class="alert alert-secondary small mb-0">
      ${e?.message || "Supervisor queue unavailable."}
    </div>`;
  }
}

async function refreshTasksPage() {
  const date = $("globalDate3")?.value || isoToday();

  const me = await api("/auth/me");
  console.log("AUTH /auth/me response:", me);
  state.currentUser = me.user || me;
  console.log("Resolved currentUser:", state.currentUser);
  
  setRoleBadge();
  applyRoleVisibility();

  await loadTasks(date);

  if (
    state.currentUser?.role === "SUPERVISOR" ||
    state.currentUser?.role === "ADMIN"
  ) {
    await loadSupervisorQueue(date);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if ($("globalDate3")) $("globalDate3").value = isoToday();

  $("btnRefresh3")?.addEventListener("click", async () => {
    try {
      await refreshTasksPage();
    } catch (e) {
      setAlert("danger", e.message);
    }
  });

  $("globalDate3")?.addEventListener("change", async () => {
    try {
      await refreshTasksPage();
    } catch (e) {
      setAlert("danger", e.message);
    }
  });

  $("btnLogout3")?.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.reload();
  });

  try {
    await refreshTasksPage();
  } catch (e) {
    setAlert("danger", e.message);
  }

  $("btnSaveLog3")?.addEventListener("click", async () => {
  try {
    await saveLogFromModal();
  } catch (e) {
    setAlert("danger", e.message || "Failed to save log.");
  }
  });
});