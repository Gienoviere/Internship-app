import { api } from "./api.js";

const state = {
  me: null,
  selectedDate: todayDateString(),
  tasks: [],
  categoryFilter: '',
  feedItems: [],
};

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

init().catch((err) => showAlert(err.message || 'Failed to load page', 'danger'));

async function init() {
  wireEvents();
  state.me = await api("/auth/me");
  els.userRoleBadge.textContent = state.me.role || "Logged in";
  els.globalDate.value = state.selectedDate;
  state.feedItems = await api("/inventory/feed-items");
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
  });

  document.getElementById("btnUpdateTask3")?.addEventListener("click", onUpdateTask);
  document.getElementById("btnAddEditSubtaskRow3")?.addEventListener("click", () => {
    addSubtaskRow("editTaskSubtasksWrap3", state.feedItems || []);
  });
  document.getElementById("btnAddCreateSubtaskRow3")?.addEventListener("click", () => {
    addSubtaskRow("createTaskSubtasksWrap3", state.feedItems || []);
  });
}

async function refresh() {
  const payload = await api(`/tasks/today?date=${encodeURIComponent(state.selectedDate)}`);
  state.tasks = payload.tasks || [];
  fillCategoryFilters();
  renderSummary();
  renderTasks();
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
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const subtaskBadges = subtasks.length
    ? subtasks.map((sub) => {
        const done = Array.isArray(task.completedSubtasks) && task.completedSubtasks.includes(sub);
        return `<span class="badge rounded-pill text-bg-light border me-1 mb-1 subtask-chip ${done ? 'done' : ''}">${escapeHtml(sub)}</span>`;
      }).join('')
    : '<span class="text-muted small">No subcomponents yet</span>';

  const photoHtml = task.photoUrl
    ? `<img src="${escapeAttr(task.photoUrl)}" class="img-fluid rounded border mt-2" alt="Task photo">`
    : '<div class="small text-muted mt-2">No photo uploaded yet</div>';

  return `
    <div class="col-12 col-xl-6">
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

          <div class="mb-2">
            <div class="small fw-semibold mb-1">Subcomponents</div>
            ${subtaskBadges}
          </div>

          <div class="small mb-2"><strong>Notes:</strong> ${escapeHtml(task.notes || 'None')}</div>
          <div class="small mb-2"><strong>Quantity:</strong> ${task.quantityGrams ?? '-'} grams</div>
          ${photoHtml}

          <div class="mt-auto pt-3 d-flex gap-2">
            <button class="btn btn-primary btn-sm" data-action="open-log" data-task-id="${task.taskId}">${task.logged ? 'Edit log' : 'Log task'}</button>
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
  const logQty = document.getElementById("logQty3");
  const logNotes = document.getElementById("logNotes3");
  const logCompleted = document.getElementById("logCompleted3");
  const logSubtasks = document.getElementById("logSubtasks3");
  const logModal = document.getElementById("logModal3");

  if (
    !logTaskId || !logId || !logTaskName || !logAnimalCategory ||
    !logTaskDescription || !logQty || !logNotes || !logCompleted ||
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
  logQty.value = task.quantityGrams ?? "";
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
      quantityGrams: toNullableNumber(document.getElementById('logQty3').value),
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
      photoRequired: document.getElementById("createTaskRequirePhoto3").checked,
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
      const newTask = await api.createTask({
        name: document.getElementById('quickCustomTaskName3').value.trim(),
        description: document.getElementById('quickCustomTaskDescription3').value.trim(),
        category: document.getElementById('quickCustomAnimalCategory3').value.trim(),
        animalCategory: document.getElementById('quickCustomAnimalCategory3').value.trim(),
        isDaily: true,
        active: true,
        sortOrder: 0,
        subtasks: textareaLines(document.getElementById('quickCustomSubtasks3').value),
      });
      taskId = newTask.id;
    }

    if (!taskId) throw new Error('Select or create a task first.');

    await api.createLog({
      date: state.selectedDate,
      taskId,
      completed: document.getElementById('quickLogCompleted3').checked,
      quantityGrams: toNullableNumber(document.getElementById('quickLogQty3').value),
      notes: document.getElementById('quickLogNotes3').value.trim(),
      completedSubtasks: [],
      photoUrl: await fileToDataUrl(els.quickLogPhoto),
    });

    bootstrap.Modal.getOrCreateInstance(document.getElementById('quickLogModal')).hide();
    showAlert('Quick log added.', 'success');
    await refresh();
  } catch (err) {
    showAlert(err.message || 'Could not add quick log', 'danger');
  }
}

function buildSubtaskCheckboxes(subtasks = [], completed = []) {
  if (!Array.isArray(subtasks) || !subtasks.length) {
    return '<div class="text-muted small">No subcomponents added for this task.</div>';
  }

  return subtasks.map((subtask, index) => `
    <label class="form-check border rounded p-2">
      <input class="form-check-input me-2" type="checkbox" value="${escapeAttr(subtask)}" ${completed?.includes(subtask) ? 'checked' : ''}>
      <span class="form-check-label">${escapeHtml(subtask)}</span>
    </label>
  `).join('');
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

  node.querySelector(".subtask-title").value = value.title || "";
  node.querySelector(".subtask-amount").value = value.amount ?? "";
  node.querySelector(".subtask-unit").value = value.unit || "g";
  node.querySelector(".subtask-required").checked = value.required !== false;
  node.querySelector(".subtask-affectsInventory").checked = Boolean(value.affectsInventory);

  const feedSelect = node.querySelector(".subtask-feedItemId");
  feedItems.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = item.name;
    feedSelect.appendChild(opt);
  });
  feedSelect.value = value.feedItemId ?? "";

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
  document.getElementById("editTaskRequirePhoto3").checked = Boolean(task.photoRequired);

  const wrap = document.getElementById("editTaskSubtasksWrap3");
  if (wrap) {
    wrap.innerHTML = "";
    const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
    subtasks.forEach((sub) => addSubtaskRow("editTaskSubtasksWrap3", state.feedItems || [], typeof sub === "string" ? { title: sub } : sub));
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
      photoRequired: document.getElementById("editTaskRequirePhoto3").checked,
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