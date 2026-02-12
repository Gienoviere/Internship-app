import { api } from "./api.js";
import { state } from "./state.js";
import { $ } from "./dom.js";
import { setAlert } from "./ui.js";

export async function loadSupervisorQueue(date) {
  const wrap = $("supQueue3");
  if (!wrap) return;

  try {
    const logs = await api(`/supervisor/logs?date=${date}&status=PENDING`);
    state.last.supQueue = logs;

    wrap.className = "d-flex flex-column gap-2";
    wrap.innerHTML = (logs || []).slice(0, 3).map(l => `
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
            <i class="bi bi-box me-1"></i>${l.quantityGrams ?? "—"}g
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
    wrap.innerHTML = `<div class="alert alert-secondary small mb-0"><i class="bi bi-info-circle me-1"></i>Niet beschikbaar voor deze rol.</div>`;
  }
}

async function decideLog(id, approvalStatus) {
  try {
    await api(`/supervisor/logs/${id}`, {
      method: "PATCH",
      json: {
        approvalStatus,
        supervisorNote: approvalStatus === "REJECTED"
          ? "Please correct and resubmit."
          : "Checked and confirmed."
      },
    });
    setAlert("success", `Log #${id} ${approvalStatus}`);
  } catch (e) {
    setAlert("danger", e.message);
  }
}
