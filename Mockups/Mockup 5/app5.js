const API_BASE = "http://localhost:3001";
function $(id) { return document.getElementById(id); }

function setAlert(type, msg) {
  const box = $("alertBox5");
  box.className = `alert alert-${type}`;
  box.textContent = msg;
  box.classList.remove("d-none");
  setTimeout(() => box.classList.add("d-none"), 4000);
}

function token() { return localStorage.getItem("token"); }

async function api(path, options = {}) {
  const headers = options.headers || {};
  if (token()) headers["Authorization"] = `Bearer ${token()}`;
  if (options.json) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.json ? JSON.stringify(options.json) : options.body
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  return data;
}

function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

let currentUser = null;

function showLogin() {
  $("viewLogin5").classList.remove("d-none");
  $("viewApp5").classList.add("d-none");
}

function showApp() {
  $("viewLogin5").classList.add("d-none");
  $("viewApp5").classList.remove("d-none");
}

async function loadMe() {
  try {
    currentUser = await api("/auth/me");
    $("roleBadge5").textContent = `${currentUser.role}`;
    $("btnLogout5").classList.remove("d-none");
    showApp();
    await loadTasks();
  } catch {
    currentUser = null;
    $("roleBadge5").textContent = "Not logged in";
    $("btnLogout5").classList.add("d-none");
    showLogin();
  }
}

function setProgress(done, total) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  $("progressText5").textContent = `Completed ${done} of ${total}`;
  $("progressBar5").style.width = `${pct}%`;
  $("pillCount5").textContent = `${pct}%`;
}

function statusBadgeHTML(t) {
  if (t.logged && t.completed) return `<span class="badge text-bg-success">Done</span>`;
  if (t.logged && !t.completed) return `<span class="badge text-bg-warning">Logged</span>`;
  return `<span class="badge text-bg-secondary">Not logged</span>`;
}

async function loadTasks() {
  const date = $("date5").value;
  try {
    const data = await api(`/tasks/today?date=${date}`);
    const tasks = data.tasks || [];

    const done = tasks.filter(t => t.logged && t.completed).length;
    setProgress(done, tasks.length);

    const list = $("tasksList5");
    list.innerHTML = "";

    if (!tasks.length) {
      list.innerHTML = `<div class="text-muted">No tasks configured.</div>`;
      return;
    }

    tasks.forEach(t => {
      const disabled = t.logged && t.completed;

      list.innerHTML += `
        <div class="task-row p-3">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <div class="task-name">${t.taskName}</div>
              <div class="small muted">${t.category}</div>
            </div>

            <div class="d-flex align-items-center gap-2">
              ${statusBadgeHTML(t)}
              <input class="form-control form-control-sm" style="width:150px"
                     id="qty5_${t.taskId}" placeholder="grams (optional)" value="${t.quantityGrams ?? ""}">
              <button class="btn btn-sm btn-primary" ${disabled ? "disabled" : ""} data-done="${t.taskId}">
                Done
              </button>
            </div>
          </div>
        </div>
      `;
    });

    // attach click handlers
    list.querySelectorAll("button[data-done]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const taskId = Number(btn.dataset.done);
        const qtyVal = $(`qty5_${taskId}`).value;
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
            }
          });

          // Optimistic feel: immediate refresh keeps it accurate
          await loadTasks();
        } catch (e) {
          setAlert("danger", e.message);
        }
      });
    });

  } catch (e) {
    setAlert("danger", e.message);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  $("date5").value = isoToday();

  $("btnRefresh5").addEventListener("click", loadTasks);

  $("btnScrollTop5").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("loginForm5").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const email = $("loginEmail5").value.trim();
      const password = $("loginPassword5").value;

      const res = await api("/auth/login", {
        method: "POST",
        json: { email, password }
      });

      localStorage.setItem("token", res.token);
      setAlert("success", "Logged in.");
      await loadMe();
    } catch (err) {
      setAlert("danger", err.message);
    }
  });

  $("btnDemoFill5").addEventListener("click", () => {
    $("loginEmail5").value = "user@example.com";
    $("loginPassword5").value = "password";
  });

  $("btnLogout5").addEventListener("click", () => {
    localStorage.removeItem("token");
    currentUser = null;
    setAlert("info", "Logged out.");
    loadMe();
  });

  await loadMe();
});
