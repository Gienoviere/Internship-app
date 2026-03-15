import { api } from "./api.js";

let allUsers = [];

function $(id) {
  return document.getElementById(id);
}

function setAlert(type, msg) {
  const box = $("usersAlert");
  if (!box) return;
  box.className = `alert alert-${type}`;
  box.textContent = msg;
  box.classList.remove("d-none");
  setTimeout(() => box.classList.add("d-none"), 4000);
}

function roleOptions(currentRole) {
  const roles = ["VOLUNTEER", "FARMER", "SUPERVISOR", "ADMIN"];
  return roles.map(r => `
    <option value="${r}" ${r === currentRole ? "selected" : ""}>${r}</option>
  `).join("");
}

function updateStats(users) {
  $("usersTotalCount").textContent = String(users.length);
  $("usersActiveCount").textContent = String(users.filter(u => u.active).length);
  $("usersFarmerCount").textContent = String(users.filter(u => u.role === "FARMER").length);
  $("usersVolunteerCount").textContent = String(users.filter(u => u.role === "VOLUNTEER").length);
}

function renderUsers(users) {
  const tbody = $("usersTable");
  if (!tbody) return;

  tbody.innerHTML = users.map(u => `
    <tr>
      <td>
        <div class="fw-semibold">${u.name}</div>
      </td>
      <td>${u.email}</td>
      <td>
        <select class="form-select form-select-sm" data-role-user-id="${u.id}">
          ${roleOptions(u.role)}
        </select>
      </td>
      <td>
        <span class="badge ${u.active ? "bg-success" : "bg-secondary"}">
          ${u.active ? "Active" : "Inactive"}
        </span>
      </td>
      <td>
        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-sm btn-outline-primary" data-save-role="${u.id}">
            Save role
          </button>

          <button
            class="btn btn-sm ${u.active ? "btn-outline-danger" : "btn-outline-success"}"
            data-toggle-active="${u.id}"
            data-next-active="${u.active ? "false" : "true"}">
            ${u.active ? "Deactivate" : "Reactivate"}
          </button>

          <button
            class="btn btn-sm btn-outline-secondary"
            data-assign-task="${u.id}"
            data-assign-name="${u.name}">
            Assign tasks
          </button>
        </div>
      </td>
    </tr>
  `).join("");

  wireUserRowActions();
}

async function loadUsers() {
  allUsers = await api("/users");
  updateStats(allUsers);
  applySearchFilter();
}

function applySearchFilter() {
  const q = $("usersSearch")?.value?.trim().toLowerCase() || "";
  const filtered = !q
    ? allUsers
    : allUsers.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );

  renderUsers(filtered);
}

async function createUser() {
  const name = $("userName").value.trim();
  const email = $("userEmail").value.trim();
  const password = $("userPassword").value;
  const role = $("userRole").value;

  if (!name || !email || !password) {
    setAlert("danger", "Name, email and password are required.");
    return;
  }

  await api("/users", {
    method: "POST",
    json: { name, email, password, role }
  });

  $("userName").value = "";
  $("userEmail").value = "";
  $("userPassword").value = "";
  $("userRole").value = "VOLUNTEER";

  setAlert("success", "User created successfully.");
  await loadUsers();
}

function wireUserRowActions() {
  const tbody = $("usersTable");
  if (!tbody) return;

  tbody.querySelectorAll("[data-save-role]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = Number(btn.getAttribute("data-save-role"));
      const select = tbody.querySelector(`[data-role-user-id="${userId}"]`);
      const role = select?.value;

      try {
        await api(`/users/${userId}/role`, {
          method: "PATCH",
          json: { role }
        });
        setAlert("success", "Role updated.");
        await loadUsers();
      } catch (e) {
        setAlert("danger", e.message || "Failed to update role.");
      }
    });
  });

  tbody.querySelectorAll("[data-toggle-active]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = Number(btn.getAttribute("data-toggle-active"));
      const active = btn.getAttribute("data-next-active") === "true";

      try {
        await api(`/users/${userId}/active`, {
          method: "PATCH",
          json: { active }
        });
        setAlert("success", active ? "User reactivated." : "User deactivated.");
        await loadUsers();
      } catch (e) {
        setAlert("danger", e.message || "Failed to change user status.");
      }
    });
  });

  tbody.querySelectorAll("[data-assign-task]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = Number(btn.getAttribute("data-assign-task"));
      const name = btn.getAttribute("data-assign-name") || "User";

      $("assignUserId").value = userId;
      $("assignUserName").textContent = name;

      try {
        await loadAllTasksForAssignment();
        await loadAssignedTasksForUser(userId);

        const modalEl = $("assignTasksModal");
        if (modalEl && window.bootstrap) {
          bootstrap.Modal.getOrCreateInstance(modalEl).show();
        }
      } catch (e) {
        setAlert("danger", e.message || "Failed to load assignments.");
      }
    });
  });
}

async function loadAllTasksForAssignment() {
  const container = $("allTasksList");
  if (!container) return;

  const today = new Date().toISOString().slice(0, 10);
  const data = await api(`/tasks/today?date=${today}`);
  const tasks = data.tasks || [];

  container.innerHTML = tasks.map(t => `
    <button
      class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
      data-pick-task="${t.taskId}">
      <span>${t.taskName}</span>
      <span class="badge bg-light text-dark border">${t.category || ""}</span>
    </button>
  `).join("");

  container.querySelectorAll("[data-pick-task]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = Number($("assignUserId").value);
      const taskId = Number(btn.getAttribute("data-pick-task"));

      try {
        await api("/task-assignments", {
          method: "POST",
          json: { taskId, userId }
        });

        setAlert("success", "Task assigned.");
        await loadAssignedTasksForUser(userId);
      } catch (e) {
        setAlert("danger", e.message || "Failed to assign task.");
      }
    });
  });
}

async function loadAssignedTasksForUser(userId) {
  const container = $("assignedTasksList");
  if (!container) return;

  const assignments = await api(`/task-assignments/user/${userId}`);

  container.innerHTML = assignments.length
    ? assignments.map(a => `
        <div class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-semibold">${a.task?.name || "Task"}</div>
            <div class="small text-muted">${a.task?.category || ""}</div>
          </div>
          <button class="btn btn-sm btn-outline-danger" data-unassign="${a.id}">
            Remove
          </button>
        </div>
      `).join("")
    : `<div class="text-muted small">No assigned tasks yet.</div>`;

  container.querySelectorAll("[data-unassign]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const assignmentId = Number(btn.getAttribute("data-unassign"));

      try {
        await api(`/task-assignments/${assignmentId}/deactivate`, {
          method: "PATCH"
        });

        setAlert("success", "Task removed.");
        await loadAssignedTasksForUser(userId);
      } catch (e) {
        setAlert("danger", e.message || "Failed to remove assignment.");
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  $("btnCreateUser")?.addEventListener("click", async () => {
    try {
      await createUser();
    } catch (e) {
      setAlert("danger", e.message || "Failed to create user.");
    }
  });

  $("usersSearch")?.addEventListener("input", applySearchFilter);

  try {
    await loadUsers();
  } catch (e) {
    setAlert("danger", e.message || "Failed to load users.");
  }
});
