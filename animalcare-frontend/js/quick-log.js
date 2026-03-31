import { api } from "./api.js";

function getDateValue() {
  return document.getElementById("globalDate3")?.value || new Date().toISOString().slice(0, 10);
}

function showQuickLogMessage(type, text) {
  const box = document.getElementById("alertBox3");
  if (!box) return;
  box.className = `alert alert-${type}`;
  box.textContent = text;
  box.classList.remove("d-none");
  setTimeout(() => box.classList.add("d-none"), 3000);
}

async function fileToDataUrlFromInput(inputEl) {
  const file = inputEl?.files?.[0];
  if (!file) return null;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function saveQuickLogShared(onSuccess) {
  const date = getDateValue();
  const taskId = Number(document.getElementById("quickLogTask3")?.value);
  const notes = document.getElementById("quickLogNotes3")?.value?.trim() || "";
  const completed = Boolean(document.getElementById("quickLogCompleted3")?.checked);
  const photoUrl = await fileToDataUrlFromInput(document.getElementById("quickLogPhoto3"));

  if (!taskId) {
    showQuickLogMessage("danger", "Please select a task.");
    return;
  }

  const todayPayload = await api(`/tasks/today?date=${date}`);
  const task = (todayPayload.tasks || []).find(t => Number(t.taskId) === taskId);

  if (!task) {
    showQuickLogMessage("danger", "Selected task could not be loaded.");
    return;
  }

  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const completedSubtasks = completed
    ? subtasks.filter(sub => sub.required !== false).map(sub => String(sub.id))
    : [];

  await api("/daily-logs", {
    method: "POST",
    json: {
      date,
      taskId,
      completed,
      notes,
      completedSubtasks,
      photoUrl
    }
  });

  const modalEl = document.getElementById("quickLogModal");
  if (modalEl && window.bootstrap) {
    bootstrap.Modal.getOrCreateInstance(modalEl).hide();
  }

  document.getElementById("quickLogTask3").value = "";
  document.getElementById("quickLogNotes3").value = "";
  document.getElementById("quickLogCompleted3").checked = true;
  if (document.getElementById("quickLogPhoto3")) {
    document.getElementById("quickLogPhoto3").value = "";
  }

  showQuickLogMessage("success", "Quick log saved.");

  if (typeof onSuccess === "function") {
    await onSuccess();
  }
}

export function wireQuickLogShared(onSuccess) {
  document.getElementById("btnQuickLogSubmit")?.addEventListener("click", async () => {
    try {
      await saveQuickLogShared(onSuccess);
    } catch (err) {
      showQuickLogMessage("danger", err.message || "Could not save quick log.");
    }
  });
}
