import { isoToday, api } from "./api.js";

function getDateValue() {
  return (
    document.getElementById("globalDate3")?.value ||
    document.getElementById("globalDateObs")?.value ||
    isoToday()
  );
}

function showQuickLogMessage(type, msg) {
  const alertIds = ["alertBox3", "alertBoxObs", "backendError"];
  for (const id of alertIds) {
    const el = document.getElementById(id);
    if (el) {
      el.className = `alert alert-${type}`;
      el.textContent = msg;
      el.classList.remove("d-none");
      setTimeout(() => el.classList.add("d-none"), 4000);
      return;
    }
  }

  // fallback
  console[type === "danger" ? "error" : "log"](msg);
}

export async function loadQuickLogTasksShared() {
  const select = document.getElementById("quickLogTask3");
  if (!select) return;

  const date = getDateValue();
  const data = await api(`/tasks/today?date=${date}`);
  const tasks = data.tasks || [];

  select.innerHTML = `
    <option value="">Select a task</option>
    ${tasks.map(t => `
      <option value="${t.taskId}">
        ${t.taskName}${t.logged ? " (already logged)" : ""}
      </option>
    `).join("")}
  `;
}

export async function saveQuickLogShared(onSuccess) {
  const date = getDateValue();
  const taskId = Number(document.getElementById("quickLogTask3")?.value);
  const qtyRaw = document.getElementById("quickLogQty3")?.value?.trim() || "";
  const notes = document.getElementById("quickLogNotes3")?.value?.trim() || "";
  const completed = Boolean(document.getElementById("quickLogCompleted3")?.checked);

  if (!taskId) {
    showQuickLogMessage("danger", "Please select a task.");
    return;
  }

  let quantityGrams = null;
  if (qtyRaw !== "") {
    quantityGrams = Number(qtyRaw);
    if (!Number.isFinite(quantityGrams) || quantityGrams < 0) {
      showQuickLogMessage("danger", "Quantity must be a valid positive number.");
      return;
    }
  }

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

  const modalEl = document.getElementById("quickLogModal");
  if (modalEl && window.bootstrap) {
    bootstrap.Modal.getOrCreateInstance(modalEl).hide();
  }

  document.getElementById("quickLogTask3").value = "";
  document.getElementById("quickLogQty3").value = "";
  document.getElementById("quickLogNotes3").value = "";
  document.getElementById("quickLogCompleted3").checked = true;

  showQuickLogMessage("success", "Quick log saved.");

  if (typeof onSuccess === "function") {
    await onSuccess();
  }
}

export function wireQuickLogShared(onSuccess) {
  const quickLogModal = document.getElementById("quickLogModal");
  const submitBtn = document.getElementById("btnQuickLogSubmit");

  if (quickLogModal) {
    quickLogModal.addEventListener("show.bs.modal", async () => {
      try {
        await loadQuickLogTasksShared();
      } catch (e) {
        showQuickLogMessage("danger", e.message || "Failed to load quick log tasks.");
      }
    });
  }

  submitBtn?.addEventListener("click", async () => {
    try {
      await saveQuickLogShared(onSuccess);
    } catch (e) {
      showQuickLogMessage("danger", e.message || "Quick log failed.");
    }
  });
}
