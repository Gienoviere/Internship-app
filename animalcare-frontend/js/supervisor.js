import { api } from "./api.js";
import { state } from "./state.js";
import { $ } from "./dom.js";
import { setAlert } from "./ui.js";

export async function loadSupervisorQueue(date) {
  if (!date) date = new Date().toISOString().slice(0, 10);
  console.log("[SUPERVISOR] loadSupervisorQueue date =", date);
  const wrap = $("supQueue3");
  const kpi = $("supPendingCount3"); // optional KPI
  if (!wrap) return;

  try {
    const logs = await api(`/supervisor/logs?date=${date}&status=PENDING`);
    state.last.supQueue = logs;

    if (kpi) kpi.textContent = String((logs || []).length);

    wrap.className = "d-flex flex-column gap-2";

    const top = (logs || []).slice(0, 6); // show more than 3 for real use
    wrap.innerHTML = top.length
      ? top.map(l => `
        <div class="card border-warning">
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
                <i class="bi bi-check-circle me-1"></i>Approve
              </button>
              <button class="btn btn-sm btn-outline-danger" data-reject="${l.id}">
                <i class="bi bi-x-circle me-1"></i>Reject
              </button>
            </div>
          </div>
        </div>
      `).join("")
      : `<div class="alert alert-secondary small mb-0">
          <i class="bi bi-info-circle me-1"></i>No pending logs for this date.
        </div>`;

    wrap.querySelectorAll("button[data-approve]").forEach(btn => {
      btn.addEventListener("click", () => decideLog(date, btn.dataset.approve, "APPROVED"));
    });
    wrap.querySelectorAll("button[data-reject]").forEach(btn => {
      btn.addEventListener("click", () => decideLog(date, btn.dataset.reject, "REJECTED"));
    });
  } catch (e) {
    // If role not allowed or endpoint not present
    if (kpi) kpi.textContent = "—";
    wrap.innerHTML = `<div class="alert alert-secondary small mb-0">
    <i class="bi bi-info-circle me-1"></i>${e?.message || "Supervisor queue unavailable."}
  </div>`;
  }
}

async function decideLog(date, id, approvalStatus) {
  try {
    const supervisorNote =
      approvalStatus === "REJECTED"
        ? (prompt("Reason (optional):") || "Please correct and resubmit.")
        : "Checked and confirmed.";

    await api(`/supervisor/logs/${id}`, {
      method: "PATCH",
      json: { approvalStatus, supervisorNote },
    });

    setAlert("success", `Log #${id} → ${approvalStatus}`);

    // Refresh queue so it disappears from pending list
    await loadSupervisorQueue(date);
  } catch (e) {
    setAlert("danger", e.message);
  }
}