import { api } from "./api.js";

const state = {
  me: null,
  role: "",
  canManage: false,
  selectedDate: todayDateString(),
  tasks: [],
  categoryFilter: '',
  feedItems: [],
  availableTasks: [],
};

function isManager() {
  return state.canManage;
}

const els = {
  userRoleBadge: document.getElementById('userRoleBadge3'),
  globalDate: document.getElementById('globalDate3'),
  btnRefresh: document.getElementById('btnRefresh3'),
  taskSummary: document.getElementById('taskSummary3'),
  taskGroups: document.getElementById('taskGroups3'),
  categoryFilter: document.getElementById('categoryFilter3'),
  alertBox: document.getElementById('alertBox3'),
  quickAnimalCategory: document.getElementById('quickAnimalCategory3'),
  quickLogTask: document.getElementById('quickLogTask3'),
  quickLogCustomToggle: document.getElementById('quickLogCustomToggle3'),
  quickExistingTaskFields: document.getElementById('quickExistingTaskFields3'),
  quickCustomTaskFields: document.getElementById('quickCustomTaskFields3'),
  quickLogPhoto: document.getElementById('quickLogPhoto3'),
  quickLogPhotoPreview: document.getElementById('quickLogPhotoPreview3'),
  btnQuickLogSubmit: document.getElementById('btnQuickLogSubmit'),
  btnCreateTask: document.getElementById('btnCreateTask3'),
  logPhoto: document.getElementById('logPhoto3'),
  logPhotoPreview: document.getElementById('logPhotoPreview3'),
  btnSaveLog: document.getElementById('btnSaveLog3'),
};

function applyPageRoleVisibility() {
  const role = String(state.role || "").toUpperCase();
  const isAdmin = role === "ADMIN";
  const isSupervisor = role === "SUPERVISOR";
  const isManager = isAdmin || isSupervisor;
  const isWorker = role === "FARMER" || role === "VOLUNTEER";

  document.querySelectorAll(".manager-only").forEach(el => {
    el.classList.toggle("d-none", !isManager);
  });

  document.querySelectorAll(".supervisor-only").forEach(el => {
    el.classList.toggle("d-none", !isSupervisor);
  });

  document.querySelectorAll(".worker-only").forEach(el => {
    el.classList.toggle("d-none", !isWorker);
  });
}

function normalizeFrontendSubtask(subtask, index = 0) {
  if (!subtask) {
    return {
      id: `sub_${index}`,
      title: "",
      description: "",
      amount: null,
      unit: "g",
      feedItemId: null,
      affectsInventory: false,
      required: true,
      photoRequired: false,
      sortOrder: index,
    };
  }

  if (typeof subtask === "string") {
    return {
      id: `sub_${index}`,
      title: subtask,
      description: "",
      amount: null,
      unit: "g",
      feedItemId: null,
      affectsInventory: false,
      required: true,
      photoRequired: false,
      sortOrder: index,
    };
  }

  let title = subtask.title;
  if (title && typeof title === "object") {
    title = title.title || title.name || String(title);
  }

  return {
    id: String(subtask.id || `sub_${index}`),
    title: String(title || "").trim(),
    description: String(subtask.description || "").trim(),
    amount:
      subtask.amount === null || subtask.amount === undefined || subtask.amount === ""
        ? null
        : Number(subtask.amount),
    unit: String(subtask.unit || "g").trim() || "g",
    feedItemId:
      subtask.feedItemId === null || subtask.feedItemId === undefined || subtask.feedItemId === ""
        ? null
        : Number(subtask.feedItemId),
    affectsInventory: Boolean(subtask.affectsInventory),
    required: subtask.required !== false,
    photoRequired: Boolean(subtask.photoRequired),
    sortOrder: Number.isFinite(Number(subtask.sortOrder)) ? Number(subtask.sortOrder) : index,
  };
}

function normalizeFrontendSubtasks(subtasks) {
  if (!Array.isArray(subtasks)) return [];
  return subtasks.map((sub, index) => normalizeFrontendSubtask(sub, index));
}

init().catch((err) => showAlert(err.message || 'Failed to load page', 'danger'));

async function init() {
  wireEvents();
  applyPageRoleVisibility();

  const meRes = await api("/auth/me");
  state.me = meRes?.user || meRes || null;
  state.role = String(state.me?.role || "").toUpperCase();
  state.canManage = state.role === "ADMIN" || state.role === "SUPERVISOR";

  console.log("AUTH ME =", state.me);
  console.log("ROLE =", state.role, "CAN MANAGE =", state.canManage);

  els.userRoleBadge.textContent = state.me?.role || "Logged in";
  els.globalDate.value = state.selectedDate;

  state.feedItems = await api("/inventory/feed-items");
  addSubtaskRow("createTaskSubtasksWrap3", state.feedItems || []);

  await refresh();
}

function wireEvents() {
  els.btnRefresh?.addEventListener('click', refresh);
  els.globalDate?.addEventListener('change', async () => {
    state.selectedDate = els.globalDate.value || todayDateString();
    await refresh();
  });
  els.categoryFilter?.addEventListener('change', () => {
    state.categoryFilter = els.categoryFilter.value;
    renderTasks();
  });
  els.quickAnimalCategory?.addEventListener('change', fillQuickTaskOptions);
  els.quickLogCustomToggle?.addEventListener('change', toggleQuickCustomMode);
  els.btnCreateTask?.addEventListener('click', onCreateTask);
  els.btnQuickLogSubmit?.addEventListener('click', onQuickLogSubmit);
  els.btnSaveLog?.addEventListener('click', onSaveLog);
  els.logPhoto?.addEventListener('change', () => previewFile(els.logPhoto, els.logPhotoPreview));
  els.quickLogPhoto?.addEventListener('change', () => previewFile(els.quickLogPhoto, els.quickLogPhotoPreview));

  document.addEventListener("click", async (event) => {
    const logBtn = event.target.closest('[data-action="open-log"]');
    if (logBtn) {
      const taskId = Number(logBtn.dataset.taskId);
      openLogModal(taskId);
      return;
    }

    const editBtn = event.target.closest('[data-action="edit-task"]');
    if (editBtn) {
      const taskId = Number(editBtn.dataset.taskId);
      openEditTaskModal(taskId);
      return;
    }

    const deleteBtn = event.target.closest('[data-action="delete-task"]');
    if (deleteBtn) {
      const taskId = Number(deleteBtn.dataset.taskId);
      await onDeleteTask(taskId);
      return;
    }

    const observationBtn = event.target.closest('[data-action="open-observation"]');
    if (observationBtn) {
      const taskId = Number(observationBtn.dataset.taskId);
      openTaskObservationModal(taskId);
      return;
    }

    const claimBtn = event.target.closest('[data-action="claim-task"]');
    if (claimBtn) {
      const taskId = Number(claimBtn.dataset.taskId);
      await onClaimTask(taskId);
      return;
    }


  });

  document.getElementById("btnUpdateTask3")?.addEventListener("click", onUpdateTask);
  document.getElementById("btnAddEditSubtaskRow3")?.addEventListener("click", () => {
    addSubtaskRow("editTaskSubtasksWrap3", state.feedItems || []);
  });

  document.getElementById("btnAddCreateSubtaskRow3")?.addEventListener("click", () => {
    addSubtaskRow("createTaskSubtasksWrap3", state.feedItems || []);
  });

  document.getElementById("taskObsPhoto3")?.addEventListener("change", () => {
  previewFile(
    document.getElementById("taskObsPhoto3"),
    document.getElementById("taskObsPhotoPreview3"));
  });

  // click the observaion button on task
  document.getElementById("btnCreateTaskObservation3")?.addEventListener("click", onCreateTaskObservation);

  // open observation from task
  document.getElementById("btnOpenObservationFromLog3")?.addEventListener("click", () => {
  const taskId = Number(document.getElementById("logTaskId3").value);
  if (!taskId) return;
  openTaskObservationModal(taskId);
  });
}

async function refresh() {
  const payload = await api(`/tasks/today?date=${encodeURIComponent(state.selectedDate)}`);

  state.tasks = (payload.tasks || []).map((task) => ({
    ...task,
    taskName: task.taskName || task.name || "",
    animalCategory: task.animalCategory || task.category || "Uncategorized",
    subtasks: normalizeFrontendSubtasks(task.subtasks),
    completedSubtasks: Array.isArray(task.completedSubtasks) ? task.completedSubtasks : [],
  }));

  console.log("TASKS TODAY =", state.tasks);

  await loadAvailableTasksForWorker();
  fillCategoryFilters();
  renderSummary();
  renderTasks();
  applyPageRoleVisibility();
}

function fillCategoryFilters() {
  const categories = uniqueCategories(state.tasks);
  const current = state.categoryFilter;
  replaceOptions(els.categoryFilter, [{ value: '', label: 'All animal categories' }, ...categories.map(c => ({ value: c, label: c }))], current);
  replaceOptions(els.quickAnimalCategory, [{ value: '', label: 'Select animal category' }, ...categories.map(c => ({ value: c, label: c }))], '');
}

function fillQuickTaskOptions() {
  const category = els.quickAnimalCategory.value;
  const tasks = state.tasks.filter((task) => !category || normalized(task.animalCategory || task.category) === normalized(category));
  replaceOptions(
    els.quickLogTask,
    [{ value: '', label: 'Select a task' }, ...tasks.map(task => ({ value: task.taskId, label: task.taskName }))],
    ''
  );
}

function toggleQuickCustomMode() {
  const custom = els.quickLogCustomToggle.checked;
  els.quickExistingTaskFields.classList.toggle('d-none', custom);
  els.quickCustomTaskFields.classList.toggle('d-none', !custom);
}

function renderSummary() {
  const total = state.tasks.length;
  const logged = state.tasks.filter(t => t.logged).length;
  const completed = state.tasks.filter(t => t.completed).length;
  const categories = uniqueCategories(state.tasks).length;

  els.taskSummary.innerHTML = [
    summaryCard('Tasks', total, 'bi-list-task'),
    summaryCard('Logged', logged, 'bi-pencil-square'),
    summaryCard('Completed', completed, 'bi-check2-circle'),
    summaryCard('Animal categories', categories, 'bi-tags'),
  ].join('');
}

function renderTasks() {
  const filtered = state.tasks.filter((task) => {
    if (!state.categoryFilter) return true;
    return normalized(task.animalCategory || task.category) === normalized(state.categoryFilter);
  });

  if (!filtered.length) {
    els.taskGroups.innerHTML = '<div class="alert alert-light border">No tasks found for this filter.</div>';
    return;
  }

  const grouped = filtered.reduce((acc, task) => {
    const category = task.animalCategory || task.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(task);
    return acc;
  }, {});

  els.taskGroups.innerHTML = Object.entries(grouped)
    .map(([category, tasks]) => renderCategorySection(category, tasks))
    .join('');
}

function renderCategorySection(category, tasks) {
  const completed = tasks.filter(task => task.completed).length;
  return `
    <section class="card shadow-sm">
      <div class="card-body">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h5 class="mb-1">${escapeHtml(category)}</h5>
            <div class="text-muted small">${completed}/${tasks.length} completed</div>
          </div>
          <span class="badge rounded-pill text-bg-light category-pill">Animal category</span>
        </div>
        <div class="row g-3">
          ${tasks.map(renderTaskCard).join('')}
        </div>
      </div>
    </section>
  `;
}

function renderTaskCard(task) {
  const subtasks = normalizeFrontendSubtasks(task.subtasks);
  const completedIds = Array.isArray(task.completedSubtasks) ? task.completedSubtasks.map(String) : [];

  const subtaskBadges = subtasks.length
    ? subtasks.map((subObj) => {
        const done = completedIds.includes(String(subObj.id));
        return `
          <div class="border rounded p-2 mb-2 ${done ? 'bg-light' : ''}">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div>
                <div class="fw-semibold ${done ? 'text-decoration-line-through text-muted' : ''}">
                  ${escapeHtml(subObj.title || "")}
                </div>
                ${
                  subObj.description
                    ? `<div class="small text-muted mt-1">${escapeHtml(subObj.description)}</div>`
                    : ""
                }
              </div>
              <div class="d-flex flex-wrap gap-1">
                ${subObj.required ? `<span class="badge text-bg-light border">Required</span>` : ""}
                ${subObj.photoRequired ? `<span class="badge text-bg-warning text-dark">Photo required</span>` : ""}
                ${done ? `<span class="badge text-bg-success">Done</span>` : ""}
              </div>
            </div>
          </div>
        `;
      }).join("")
    : '<span class="text-muted small">No subcomponents yet</span>';

  const photoHtml = task.photoUrl
    ? `<img src="${escapeAttr(task.photoUrl)}" class="img-fluid rounded border mt-2" alt="Task photo">`
    : '<div class="small text-muted mt-2">No photo uploaded yet</div>';

  const assignedText = Array.isArray(task.assignedUsers) && task.assignedUsers.length
    ? task.assignedUsers.map((u) => u.name).join(", ")
    : "Nobody assigned yet";

  return `
    <div class="${isManager() ? 'col-12 col-xxl-6' : 'col-12'}">
      <div class="card task-card h-100 border ${task.completed ? 'border-success' : ''}">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <div>
              <h6 class="mb-1">${escapeHtml(task.taskName)}</h6>
              <div class="small text-muted">${escapeHtml(task.feedItemName || 'No inventory item linked')}</div>
            </div>
            <span class="badge ${task.completed ? 'text-bg-success' : task.logged ? 'text-bg-warning' : 'text-bg-secondary'}">
              ${task.completed ? 'Completed' : task.logged ? 'Logged' : 'Open'}
            </span>
          </div>

          <p class="text-muted small mb-2">${escapeHtml(task.description || 'No description added yet.')}</p>

          ${isManager() ? `<div class="small mb-2"><strong>Picked by:</strong> ${escapeHtml(assignedText)}</div>` : ""}

          <div class="mb-2">
            <div class="small fw-semibold mb-1">Subcomponents</div>
            ${subtaskBadges}
          </div>

          <div class="small mb-2"><strong>Notes:</strong> ${escapeHtml(task.notes || 'None')}</div>
          ${photoHtml}

          <div class="mt-auto pt-3 d-flex gap-2 flex-wrap">
            <button class="btn btn-primary btn-sm" data-action="open-log" data-task-id="${task.taskId}">
              ${task.logged ? 'Continue task log' : 'Open task'}
            </button>

            <button class="btn btn-outline-warning btn-sm" data-action="open-observation" data-task-id="${task.taskId}">
              Add observation
            </button>

            ${isManager() ? `
              <button class="btn btn-outline-secondary btn-sm" data-action="edit-task" data-task-id="${task.taskId}">
                Edit task
              </button>
              <button class="btn btn-outline-danger btn-sm" data-action="delete-task" data-task-id="${task.taskId}">
                Delete
              </button>
            ` : ""}

            ${!isManager() && !task.logged ? `
              <button class="btn btn-outline-secondary btn-sm" data-action="release-task" data-task-id="${task.taskId}">
                Release
              </button>
            ` : ""}
          </div>
        </div>
      </div>
    </div>
  `;
}

function openLogModal(taskId) {
  const task = state.tasks.find((item) => item.taskId === taskId);
  if (!task) return;

  const logTaskId = document.getElementById("logTaskId3");
  const logId = document.getElementById("logId3");
  const logTaskName = document.getElementById("logTaskName3");
  const logAnimalCategory = document.getElementById("logAnimalCategory3");
  const logTaskDescription = document.getElementById("logTaskDescription3");
  const logNotes = document.getElementById("logNotes3");
  const logCompleted = document.getElementById("logCompleted3");
  const logSubtasks = document.getElementById("logSubtasks3");
  const logModal = document.getElementById("logModal3");

  if (
  !logTaskId || !logId || !logTaskName || !logAnimalCategory ||
  !logTaskDescription || !logNotes || !logCompleted ||
  !logSubtasks || !logModal
  ) {
    showAlert("Log modal elements are missing from tasks.html", "danger");
    return;
  }

  logTaskId.value = task.taskId;
  logId.value = task.logId || "";
  logTaskName.value = task.taskName || "";
  logAnimalCategory.value = task.animalCategory || task.category || "";
  logTaskDescription.value = task.description || "";
  logNotes.value = task.notes || "";
  logCompleted.checked = Boolean(task.completed);
  logSubtasks.innerHTML = buildSubtaskCheckboxes(task.subtasks, task.completedSubtasks);

  if (els.logPhoto) els.logPhoto.value = "";
  if (els.logPhotoPreview) {
    els.logPhotoPreview.style.display = task.photoUrl ? "block" : "none";
    els.logPhotoPreview.src = task.photoUrl || "";
  }

  bootstrap.Modal.getOrCreateInstance(logModal).show();
}

async function onSaveLog() {
  try {
    const taskId = Number(document.getElementById('logTaskId3').value);
    const logId = Number(document.getElementById('logId3').value || 0);
    const photoBase64 = await fileToDataUrl(els.logPhoto);
    const payload = {
      date: state.selectedDate,
      taskId,
      completed: document.getElementById('logCompleted3').checked,
      notes: document.getElementById('logNotes3').value.trim(),
      completedSubtasks: checkedValues('#logSubtasks3 input[type="checkbox"]'),
      photoUrl: photoBase64,
    };

    if (logId) {
      await api(`/daily-logs/${logId}`, {
        method: "PATCH",
        json: payload,
      });
    } else {
      await api("/daily-logs", {
        method: "POST",
        json: payload,
      });
    }

    bootstrap.Modal.getOrCreateInstance(document.getElementById('logModal3')).hide();
    showAlert('Task log saved.', 'success');
    await refresh();
  } catch (err) {
    showAlert(err.message || 'Could not save log', 'danger');
  }
}

async function onCreateTask() {
  try {
    const payload = {
      name: document.getElementById("createTaskName3").value.trim(),
      description: document.getElementById("createTaskDescription3").value.trim(),
      category: document.getElementById("createAnimalCategory3").value.trim(),
      animalCategory: document.getElementById("createAnimalCategory3").value.trim(),
      isDaily: document.getElementById("createTaskDaily3").checked,
      sortOrder: Number(document.getElementById("createTaskSortOrder3").value || 0),
      active: document.getElementById("createTaskActive3").checked,
      subtasks: collectSubtasks("createTaskSubtasksWrap3"),
    };

    await api("/tasks", { method: "POST", json: payload });
    bootstrap.Modal.getOrCreateInstance(document.getElementById("createTaskModal")).hide();
    showAlert("Task created.", "success");
    await refresh();
  } catch (err) {
    showAlert(err.message || "Could not create task", "danger");
  }
}

async function onQuickLogSubmit() {
  try {
    let taskId = Number(els.quickLogTask.value || 0);

    if (els.quickLogCustomToggle.checked) {
      const newTask = await api("/tasks", {
        method: "POST",
        json: {
          name: document.getElementById("quickCustomTaskName3").value.trim(),
          description: document.getElementById("quickCustomTaskDescription3").value.trim(),
          category: document.getElementById("quickCustomAnimalCategory3").value.trim(),
          animalCategory: document.getElementById("quickCustomAnimalCategory3").value.trim(),
          isDaily: true,
          active: true,
          sortOrder: 0,
          subtasks: textareaLines(document.getElementById("quickCustomSubtasks3").value).map((title, index) => ({
            id: `sub_${Date.now()}_${index}`,
            title,
            description: "",
            amount: null,
            unit: "g",
            feedItemId: null,
            affectsInventory: false,
            required: true,
            photoRequired: false,
            sortOrder: index,
          })),
        },
      });

      taskId = newTask.id;
      await refresh();
    }

    if (!taskId) throw new Error("Select or create a task first.");

    const task = state.tasks.find((t) => Number(t.taskId) === Number(taskId));
    if (!task) throw new Error("Selected task could not be loaded.");

    const subtasks = normalizeFrontendSubtasks(task.subtasks);
    const completed = document.getElementById("quickLogCompleted3").checked;

    const completedSubtasks = completed
      ? subtasks.filter((sub) => sub.required !== false).map((sub) => String(sub.id))
      : [];

    await api("/daily-logs", {
      method: "POST",
      json: {
        date: state.selectedDate,
        taskId,
        completed,
        notes: document.getElementById("quickLogNotes3").value.trim(),
        completedSubtasks,
        photoUrl: await fileToDataUrl(els.quickLogPhoto),
      },
    });

    bootstrap.Modal.getOrCreateInstance(document.getElementById("quickLogModal")).hide();
    showAlert("Quick log added.", "success");
    await refresh();
  } catch (err) {
    showAlert(err.message || "Could not add quick log", "danger");
  }
}

function buildSubtaskCheckboxes(subtasks = [], completed = []) {
  const normalizedSubtasks = normalizeFrontendSubtasks(subtasks);

  if (!normalizedSubtasks.length) {
    return '<div class="text-muted small">No subcomponents added for this task.</div>';
  }

  const completedIds = Array.isArray(completed) ? completed.map(String) : [];

  return normalizedSubtasks.map((sub) => {
    const checked = completedIds.includes(String(sub.id));

    return `
      <label class="form-check border rounded p-3">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div class="d-flex gap-2">
            <input class="form-check-input mt-1" type="checkbox" value="${escapeAttr(String(sub.id))}" ${checked ? "checked" : ""}>
            <div>
              <div class="form-check-label fw-semibold">${escapeHtml(sub.title || "")}</div>
              ${sub.description ? `<div class="small text-muted mt-1">${escapeHtml(sub.description)}</div>` : ""}
            </div>
          </div>
          <div class="d-flex flex-wrap gap-1">
            ${sub.required ? `<span class="badge text-bg-light border">Required</span>` : ""}
            ${sub.photoRequired ? `<span class="badge text-bg-warning text-dark">Photo required</span>` : ""}
          </div>
        </div>
      </label>
    `;
  }).join("");
}

function checkedValues(selector) {
  return [...document.querySelectorAll(selector)].filter(el => el.checked).map(el => el.value);
}

function replaceOptions(select, options, selected) {
  if (!select) return;
  select.innerHTML = options.map((option) => `<option value="${escapeAttr(option.value)}">${escapeHtml(option.label)}</option>`).join('');
  if (selected !== undefined) select.value = selected;
}

function summaryCard(label, value, icon) {
  return `
    <div class="col-12 col-md-6 col-xl-3">
      <div class="card shadow-sm h-100">
        <div class="card-body d-flex align-items-center justify-content-between">
          <div>
            <div class="text-muted small">${escapeHtml(label)}</div>
            <div class="fs-4 fw-semibold">${value}</div>
          </div>
          <i class="bi ${icon} fs-2 text-muted"></i>
        </div>
      </div>
    </div>
  `;
}

function uniqueCategories(tasks) {
  return [...new Set(tasks.map(t => t.animalCategory || t.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function textareaLines(text) {
  return String(text || '').split('\n').map(s => s.trim()).filter(Boolean);
}

function toNullableNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalized(value) {
  return String(value || '').trim().toLowerCase();
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function showAlert(message, type = 'info') {
  els.alertBox.className = `alert alert-${type}`;
  els.alertBox.textContent = message;
  els.alertBox.classList.remove('d-none');
  window.clearTimeout(showAlert._timer);
  showAlert._timer = window.setTimeout(() => els.alertBox.classList.add('d-none'), 3500);
}

async function readError(res) {
  try {
    const data = await res.json();
    return data.error || 'Request failed';
  } catch {
    return 'Request failed';
  }
}

function previewFile(input, img) {
  const file = input?.files?.[0];
  if (!file) {
    img.style.display = 'none';
    img.removeAttribute('src');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    img.src = reader.result;
    img.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function fileToDataUrl(input) {
  const file = input?.files?.[0];
  if (!file) return Promise.resolve(undefined);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function addSubtaskRow(wrapId, feedItems = [], value = {}) {
  const wrap = document.getElementById(wrapId);
  const tpl = document.getElementById("taskSubtaskRowTemplate");
  const node = tpl.content.firstElementChild.cloneNode(true);

  const sub = normalizeFrontendSubtask(value);

  node.dataset.subtaskId = sub.id;
  node.querySelector(".subtask-title").value = sub.title || "";
  node.querySelector(".subtask-amount").value = sub.amount ?? "";
  node.querySelector(".subtask-unit").value = sub.unit || "g";
  node.querySelector(".subtask-required").checked = sub.required !== false;
  node.querySelector(".subtask-affectsInventory").checked = Boolean(sub.affectsInventory);
  node.querySelector(".subtask-description").value = value.description || "";
  node.querySelector(".subtask-photoRequired").checked = Boolean(value.photoRequired);

  const feedSelect = node.querySelector(".subtask-feedItemId");
  feedItems.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = item.name;
    feedSelect.appendChild(opt);
  });
  feedSelect.value = sub.feedItemId ?? "";

  node.querySelector(".btn-remove-subtask").addEventListener("click", () => {
    node.remove();
  });

  wrap.appendChild(node);
}

function collectSubtasks(wrapId) {
  return [...document.querySelectorAll(`#${wrapId} .subtask-row`)]
    .map((row, index) => ({
      id: row.dataset.subtaskId || `sub_${Date.now()}_${index}`,
      title: row.querySelector(".subtask-title").value.trim(),
      amount: row.querySelector(".subtask-amount").value === ""
        ? null
        : Number(row.querySelector(".subtask-amount").value),
      unit: row.querySelector(".subtask-unit").value,
      feedItemId: row.querySelector(".subtask-feedItemId").value || null,
      affectsInventory: row.querySelector(".subtask-affectsInventory").checked,
      required: row.querySelector(".subtask-required").checked,
      sortOrder: index,
      description: row.querySelector(".subtask-description").value.trim(),
      photoRequired: row.querySelector(".subtask-photoRequired").checked,
    }))
    .filter((s) => s.title);
}

function openEditTaskModal(taskId) {
  const task = state.tasks.find((item) => item.taskId === taskId);
  if (!task) return;

  document.getElementById("editTaskId3").value = task.taskId;
  document.getElementById("editTaskName3").value = task.taskName || "";
  document.getElementById("editTaskDescription3").value = task.description || "";
  document.getElementById("editAnimalCategory3").value = task.animalCategory || task.category || "";
  document.getElementById("editTaskDaily3").checked = Boolean(task.isDaily);
  document.getElementById("editTaskSortOrder3").value = task.sortOrder ?? 0;
  document.getElementById("editTaskActive3").checked = task.active !== false;

  const wrap = document.getElementById("editTaskSubtasksWrap3");
  if (wrap) {
    wrap.innerHTML = "";
    normalizeFrontendSubtasks(task.subtasks).forEach((sub) => {
      addSubtaskRow("editTaskSubtasksWrap3", state.feedItems || [], sub);
    });
  }

  bootstrap.Modal.getOrCreateInstance(document.getElementById("editTaskModal")).show();
}

async function onUpdateTask() {
  try {
    const taskId = Number(document.getElementById("editTaskId3").value);

    const payload = {
      name: document.getElementById("editTaskName3").value.trim(),
      description: document.getElementById("editTaskDescription3").value.trim(),
      category: document.getElementById("editAnimalCategory3").value.trim(),
      animalCategory: document.getElementById("editAnimalCategory3").value.trim(),
      isDaily: document.getElementById("editTaskDaily3").checked,
      sortOrder: Number(document.getElementById("editTaskSortOrder3").value || 0),
      active: document.getElementById("editTaskActive3").checked,
      subtasks: collectSubtasks("editTaskSubtasksWrap3"),
    };

    await api(`/tasks/${taskId}`, {
      method: "PATCH",
      json: payload,
    });

    bootstrap.Modal.getOrCreateInstance(document.getElementById("editTaskModal")).hide();
    showAlert("Task updated.", "success");
    await refresh();
  } catch (err) {
    showAlert(err.message || "Could not update task", "danger");
  }
}

async function onDeleteTask(taskId) {
  const ok = window.confirm("Delete this task? It will be deactivated.");
  if (!ok) return;

  try {
    await api(`/tasks/${taskId}`, {
      method: "DELETE",
    });

    showAlert("Task deleted.", "success");
    await refresh();
  } catch (err) {
    showAlert(err.message || "Could not delete task", "danger");
  }
}

// observation addition in task
function openTaskObservationModal(taskId) {
  const task = state.tasks.find((item) => item.taskId === taskId);
  if (!task) return;

  document.getElementById("taskObsTaskId3").value = task.taskId;
  document.getElementById("taskObsTaskName3").value = task.taskName || "";
  document.getElementById("taskObsAnimal3").value = task.animalCategory || task.category || "";
  document.getElementById("taskObsSeverity3").value = "WARN";
  document.getElementById("taskObsTitle3").value = "";
  document.getElementById("taskObsDesc3").value = "";

  const photoInput = document.getElementById("taskObsPhoto3");
  const photoPreview = document.getElementById("taskObsPhotoPreview3");
  if (photoInput) photoInput.value = "";
  if (photoPreview) {
    photoPreview.src = "";
    photoPreview.style.display = "none";
  }

  bootstrap.Modal.getOrCreateInstance(document.getElementById("taskObservationModal")).show();
}

// create observation from task
async function onCreateTaskObservation() {
  try {
    const taskId = Number(document.getElementById("taskObsTaskId3").value);
    const title = document.getElementById("taskObsTitle3").value.trim();
    const description = document.getElementById("taskObsDesc3").value.trim();
    const severity = document.getElementById("taskObsSeverity3").value || "WARN";
    const animalTag = document.getElementById("taskObsAnimal3").value.trim();
    const photoUrl = await fileToDataUrl(document.getElementById("taskObsPhoto3"));

    if (!taskId) throw new Error("Task is missing.");
    if (!title) throw new Error("Observation title is required.");

    const created = await api("/observations", {
      method: "POST",
      json: {
        date: state.selectedDate,
        title,
        description,
        severity,
        animalTag,
        status: "OPEN",
        taskId,
      },
    });

    if (photoUrl) {
      // optional simple approach if your observations route later supports base64
      // for now better keep photo upload on Observations page route style
    }

    bootstrap.Modal.getOrCreateInstance(document.getElementById("taskObservationModal")).hide();
    showAlert("Observation created and linked to task.", "success");
  } catch (err) {
    showAlert(err.message || "Could not create observation", "danger");
  }
}

// load tasks made by admin and supervisor to the users
async function loadAvailableTasksForWorker() {
  if (isManager()) return;

  const allTasks = await api("/tasks");
  const pickedTaskIds = new Set(state.tasks.map(t => Number(t.taskId)));

  state.availableTasks = (allTasks || [])
    .filter(task => task.active !== false)
    .filter(task => task.isDaily !== false)
    .filter(task => !pickedTaskIds.has(Number(task.id)));

  renderAvailableTasks();
}

// render the tasks every day
function renderAvailableTasks() {
  const wrap = document.getElementById("availableTasks3");
  if (!wrap) return;

  if (isManager()) {
    wrap.innerHTML = "";
    return;
  }

  if (!state.availableTasks.length) {
    wrap.innerHTML = `<div class="text-muted small">No available tasks to pick up right now.</div>`;
    return;
  }

  wrap.innerHTML = state.availableTasks.map(task => `
    <div class="border rounded p-3 d-flex justify-content-between align-items-start gap-3">
      <div>
        <div class="fw-semibold">${escapeHtml(task.name || task.taskName || "Task")}</div>
        <div class="small text-muted">${escapeHtml(task.animalCategory || task.category || "Uncategorized")}</div>
        ${task.description ? `<div class="small mt-2">${escapeHtml(task.description)}</div>` : ""}
      </div>
      <button class="btn btn-sm btn-primary" data-action="claim-task" data-task-id="${task.id}">
        Pick up task
      </button>
    </div>
  `).join("");
}

async function onClaimTask(taskId) {
  try {
    await api("/task-assignments/claim", {
      method: "POST",
      json: { taskId },
    });

    showAlert("Task picked up.", "success");
    await refresh();
  } catch (err) {
    showAlert(err.message || "Could not pick up task", "danger");
  }
}