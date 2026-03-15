import { api } from "./api.js";

function roleOptions(currentRole) {
  const roles = ["VOLUNTEER", "FARMER", "SUPERVISOR", "ADMIN"];
  return roles.map(r => `
    <option value="${r}" ${r === currentRole ? "selected" : ""}>${r}</option>
  `).join("");
}

async function loadUsers() {
  const users = await api("/users");
  const tbody = document.getElementById("usersTable");
  if (!tbody) return;

  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td style="max-width:180px;">
        <select class="form-select form-select-sm" data-role-user-id="${u.id}">
          ${roleOptions(u.role)}
        </select>
      </td>
      <td>
        <span class="badge ${u.active ? "bg-success" : "bg-secondary"}">
          ${u.active ? "Active" : "Inactive"}
        </span>
      </td>
      <td class="d-flex gap-2">
        <button
          class="btn btn-sm btn-outline-primary"
          data-save-role="${u.id}">
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
      </td>
    </tr>
  `).join("");

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
        alert("Role updated.");
        await loadUsers();
      } catch (e) {
        alert(e.message || "Failed to update role.");
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
        alert(active ? "User reactivated." : "User deactivated.");
        await loadUsers();
      } catch (e) {
        alert(e.message || "Failed to change user status.");
      }
    });
  });

  tbody.querySelectorAll("[data-assign-task]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = Number(btn.getAttribute("data-assign-task"));
      const name = btn.getAttribute("data-assign-name") || "User";

      document.getElementById("assignUserId").value = userId;
      document.getElementById("assignUserName").textContent = name;

      await loadAllTasksForAssignment();
      await loadAssignedTasksForUser(userId);

      const modalEl = document.getElementById("assignTasksModal");
      if (modalEl && window.bootstrap) {
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
      }
    });
  });
}

async function createUser() {
  const name = document.getElementById("userName").value.trim();
  const email = document.getElementById("userEmail").value.trim();
  const password = document.getElementById("userPassword").value;
  const role = document.getElementById("userRole").value;

  await api("/users", {
    method: "POST",
    json: { name, email, password, role }
  });

  document.getElementById("userName").value = "";
  document.getElementById("userEmail").value = "";
  document.getElementById("userPassword").value = "";
  document.getElementById("userRole").value = "VOLUNTEER";

  await loadUsers();
}

async function loadAllTasksForAssignment() {
  const container = document.getElementById("allTasksList");
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
      const userId = Number(document.getElementById("assignUserId").value);
      const taskId = Number(btn.getAttribute("data-pick-task"));

      try {
        await api("/task-assignments", {
          method: "POST",
          json: { taskId, userId }
        });

        await loadAssignedTasksForUser(userId);
      } catch (e) {
        alert(e.message || "Failed to assign task.");
      }
    });
  });
}

async function loadAssignedTasksForUser(userId) {
  const container = document.getElementById("assignedTasksList");
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

        await loadAssignedTasksForUser(userId);
      } catch (e) {
        alert(e.message || "Failed to remove assignment.");
      }
    });
  });
}

document.getElementById("btnCreateUser")?.addEventListener("click", async () => {
  try {
    await createUser();
  } catch (e) {
    alert(e.message || "Failed to create user.");
  }
});

loadUsers();

