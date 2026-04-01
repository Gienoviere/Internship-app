import { api } from "./api.js";
import { state } from "./state.js";
import { $, setText } from "./dom.js";
import { setAlert } from "./ui.js";

export async function loadTasksToday(date) {
  const data = await api(`/tasks/today?date=${date}`);
  state.last.tasksToday = data;

  const tasks = data.tasks || [];
  setText("kpiTasks3", String(tasks.length));

  const tbody = $("tasksTbody3");
  if (!tbody) return;

  tbody.innerHTML = "";

  tasks.forEach((t) => {
    const status = t.logged ? (t.completed ? "Logged" : "Logged (incomplete)") : "Not logged";
    const badgeClass = t.logged && t.completed ? "text-bg-success" : t.logged ? "text-bg-warning" : "text-bg-secondary";
    const disabled = t.logged && t.completed;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="fw-semibold">${t.taskName}</span></td>
      <td><span class="badge bg-light text-dark border">${t.category ?? "—"}</span></td>
      <td><span class="badge ${badgeClass}">${status}</span></td>
      <td>
        <div class="d-flex gap-2">
          <input class="form-control form-control-sm" style="max-width:120px"
            id="qty3_${t.taskId}" placeholder="gram" value="${t.quantityGrams ?? ""}">
          <button class="btn btn-sm btn-${disabled ? "secondary" : "primary"}" ${disabled ? "disabled" : ""} data-log="${t.taskId}">
            <i class="bi bi-check-circle me-1"></i>Log
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
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
            notes: "",
          },
        });
        setAlert("success", "Task logged.");
      } catch (e) {
        setAlert("danger", e.message);
      }
    });
  });
}
