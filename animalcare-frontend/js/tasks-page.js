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

    const disabled = t.logged && t.completed;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><span class="fw-semibold">${t.taskName}</span></td>
      <td><span class="badge bg-light text-dark border">${t.category || ""}</span></td>
      <td><span class="badge ${badgeClass}">${status}</span></td>
      <td>
        <div class="d-flex gap-2">
          <input class="form-control form-control-sm" style="max-width:120px"
            id="qty3_${t.taskId}" placeholder="gram" value="${t.quantityGrams ?? ""}">
          <button class="btn btn-sm btn-${disabled ? "secondary" : "primary"}"
            ${disabled ? "disabled" : ""}
            data-log="${t.taskId}">
            Log
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });

  tbody.querySelectorAll("button[data-log]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const taskId = Number(btn.dataset.log);
      const qtyVal = $(`qty3_${taskId}`)?.value;
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
          },
        });
        setAlert("success", "Task logged.");
        await refreshTasksPage();
      } catch (e) {
        setAlert("danger", e.message);
      }
    });
  });
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
});