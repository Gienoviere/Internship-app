import { api } from "./api.js";
import { state } from "./state.js";
import { $, setHTML, setText } from "./dom.js";
import { badgeForStatus } from "./ui.js";
import { setAlert } from "./ui.js";

function pill(status) {
  const cls =
    status === "CRITICAL" ? "bg-danger" :
    status === "WARN" ? "bg-warning text-dark" :
    status === "OK" ? "bg-success" :
    "bg-secondary";
  return `<span class="badge ${cls}">${status}</span>`;
}

function wireInvSearchOnce() {
  const s = document.getElementById("invSearch3");
  if (!s || s.dataset.wired) return;
  s.dataset.wired = "1";
  s.addEventListener("input", () => {
    // re-render from cached data if present
    renderInventoryTableFromCache();
  });
}

function renderInventoryTableFromCache() {
  const tbody = document.getElementById("inventoryTable3");
  if (!tbody) return;

  const q = (document.getElementById("invSearch3")?.value || "").trim().toLowerCase();

  const list = (window.__invTableCache || []);
  const filtered = q ? list.filter(i => i.name.toLowerCase().includes(q)) : list;

  tbody.innerHTML = filtered.length
    ? filtered.map(i => `
        <tr>
          <td class="fw-semibold">${i.name}</td>
          <td>${pill(i.status)}</td>
          <td class="text-end">${i.stockGrams}</td>
          <td class="text-end">${i.avgDailyConsumedGrams}</td>
          <td class="text-end">${i.estimatedDaysRemaining ?? "—"}</td>
          <td class="text-end">${i.suggestedOrderKg ?? "—"}</td>
          <td class="text-muted small">${i.reorderRule ?? "—"}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="7" class="text-muted">No items</td></tr>`;
}

async function loadInventoryTable() {
  // This assumes both endpoints exist:
  // 1) /admin/inventory-warnings  -> gives status + suggestedOrderKg
  // 2) /inventory/feed-items      -> gives name, stockGrams, reorderRule
  //
  // If thy feed-items GET path differeth, amend it here.
  const [warnings, feedItems] = await Promise.all([
    api(`/admin/inventory-warnings?lookbackDays=14&warnDays=21&criticalDays=7`),
    api(`/inventory/feed-items`),
  ]);

  const warnItems = warnings.items || warnings;
  const byId = new Map((warnItems || []).map(w => [w.feedItemId, w]));

  const list = (feedItems || []).map(fi => {
    const w = byId.get(fi.id);
    return {
      id: fi.id,
      name: fi.name,
      stockGrams: fi.stockGrams,
      reorderRule: fi.reorderRule,
      status: w?.status ?? "INSUFFICIENT_DATA",
      avgDailyConsumedGrams: w?.avgDailyConsumedGrams ?? 0,
      estimatedDaysRemaining: w?.estimatedDaysRemaining ?? null,
      suggestedOrderKg: w?.suggestedOrderKg ?? null,
    };
  });

  window.__invTableCache = list;
  wireInvSearchOnce();
  renderInventoryTableFromCache();
}

export async function loadAdminPanels(date) {
  const [missed, warnings, overview] = await Promise.all([
    api(`/admin/missed-tasks?date=${date}`),
    api(`/admin/inventory-warnings?lookbackDays=14&warnDays=21&criticalDays=7`),
    api(`/admin/daily-overview?date=${date}`),
    
  ]);

  state.last.missed = missed;
  state.last.warnings = warnings;
  state.last.overview = overview;

  await loadCriticalObservations(date);
  await loadInventoryTable();


  // Missed KPI
  const missedCount = missed.missedCount ?? 0;
  setText("missedCount3", String(missedCount));

  if ($("kpiMissed3")) {
    setHTML("kpiMissed3", `
      <div class="card border-danger mb-3">
        <div class="card-body text-danger p-3">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h6 class="card-title mb-0"><i class="bi bi-exclamation-triangle-fill me-1"></i>Gemiste taken</h6>
              <span class="fs-3 fw-bold">${missedCount}</span>
            </div>
            <span class="badge bg-danger">⚠️ actie</span>
          </div>
        </div>
      </div>
    `);
  }

  // Inventory
  const items = warnings.items || [];
  const warningsContainer = $("warningsTable3");
  if (warningsContainer) {
    warningsContainer.innerHTML = items.slice(0, 6).map(i => `
      <div class="alert alert-${i.status === "CRITICAL" ? "danger" : i.status === "WARN" ? "warning" : "success"} d-flex align-items-center mb-0 p-2">
        <div class="flex-grow-1">
          <strong>${i.name}</strong><br>
          <small>Voorraad: ${i.stockGrams}g · Gem.: ${i.avgDailyConsumedGrams}g/dag · Dagen: ${i.estimatedDaysRemaining ?? "—"}</small>
        </div>
        <span class="badge ${badgeForStatus(i.status)}">${i.status}</span>
      </div>
    `).join("");
  }

  // Overview totals
  const totals = overview.totals || {};
  setHTML("overviewTotals3", `
    <span class="badge bg-secondary">Totaal: ${totals.tasksTotal ?? "—"}</span>
    <span class="badge bg-success">Voltooid: ${totals.completed ?? "—"}</span>
    <span class="badge bg-danger">Missing: ${totals.missing ?? "—"}</span>
    <span class="badge bg-warning">Incompleet: ${totals.incomplete ?? "—"}</span>
  `);

  // Overview table
  const ot = $("overviewTable3");
  if (ot) {
    ot.innerHTML = "";
    (overview.tasks || []).forEach(t => {
      const badgeClass = t.status === "missing" ? "text-bg-danger" : t.status === "incomplete" ? "text-bg-warning" : "text-bg-success";
      const loggedBy = (t.logs || []).map(l => l.user?.name).filter(Boolean).join(", ");
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${t.taskName}</td>
        <td><span class="badge ${badgeClass}">${t.status}</span> ${t.warning ? "❗" : ""}</td>
        <td>${loggedBy || '<span class="text-muted">—</span>'}</td>
      `;
      ot.appendChild(row);
    });
  }

  //Observation
  async function loadCriticalObservations(date) {
  const data = await api(`/admin/critical-observations?date=${date}`);

  const countEl = document.getElementById("criticalObsCount");
  const listEl = document.getElementById("criticalObsList");

  if (!countEl || !listEl) return;

  countEl.textContent = data.count;

  listEl.innerHTML = data.items.length
    ? data.items.map(o => `
        <div class="alert alert-danger mb-1 p-2">
          <strong>${o.title}</strong><br>
          <small>${o.createdBy?.name || ""} – ${o.description || ""}</small>
        </div>
      `).join("")
    : `<div class="text-muted small">No critical observations</div>`;
    
}
}

export function wireAdminActions() {
  const btn = $("btnSendSummary");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const date = $("globalDate")?.value;

    if (!date) {
      setAlert("danger", "Select a date first.");
      return;
    }

    btn.disabled = true;
    btn.innerHTML = "Sending...";

    try {
      const res = await api("/admin/send-daily-summary", {
        method: "POST",
        json: {
          date,
          lookbackDays: 14,
          warnDays: 21,
          criticalDays: 7
        }
      });

      setAlert("success", `Email sent to ${res.sentTo}`);
    } catch (err) {
      setAlert("danger", err.message || "Failed to send email");
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-envelope"></i> Send Email';
    }
  });

  const btnCsv = $("btnDownloadCsv");
if (btnCsv) {
  btnCsv.addEventListener("click", async () => {
    const date = $("globalDate")?.value;
    if (!date) return setAlert("danger", "Select a date first.");

    const token = localStorage.getItem("token");
    if (!token) return setAlert("danger", "Not logged in.");

    // Download using fetch so we can attach Authorization header
    try {
      btnCsv.disabled = true;
      btnCsv.textContent = "Downloading...";

      const res = await fetch(`http://localhost:3001/admin/export-daily.csv?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Export failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `daily-summary-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);

      setAlert("success", "CSV downloaded.");
    } catch (e) {
      setAlert("danger", e.message);
    } finally {
      btnCsv.disabled = false;
      btnCsv.innerHTML = '<i class="bi bi-download"></i> Download CSV';
    }
  });
}
}
