// ui.js
import { feedItems, getDisplayAvg, getStatus, manualAvgUsage, avgUsageCache, movements } from './state.js';
import { LARGE_DAYS } from './config.js';
import { loadSettings } from './settings.js';

// DOM-elementen (één keer opvragen)
const tbody = document.getElementById('inventoryTableBody');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const totalItemsEl = document.getElementById('totalItems');
const sufficientCountEl = document.getElementById('sufficientCount');
const lowCountEl = document.getElementById('lowCount');
const almostOutCountEl = document.getElementById('almostOutCount');
const alertMessageEl = document.getElementById('alertMessage');
const usageContainer = document.getElementById('usageContainer');
const usageHistoryTableBody = document.getElementById('usageHistoryTableBody');
const backendErrorEl = document.getElementById('backendError');
const movementsErrorEl = document.getElementById('movementsError');

// Simpele toastmelding (groen voor succes, rood voor fout)
export function showMessage(text, isError = false) {
  const msg = document.getElementById('simpleMessage');
  msg.textContent = (isError ? '❌ ' : '✔️ ') + text;
  msg.style.backgroundColor = isError ? '#dc3545' : '#198754';
  msg.style.display = 'block';
  setTimeout(() => { msg.style.display = 'none'; }, 2500);
}

// Tabel renderen
export function renderTable() {
  const searchTerm = searchInput.value.toLowerCase();
  const filterValue = statusFilter.value;

  const filtered = feedItems.filter(item => {
    if (searchTerm && !item.name.toLowerCase().includes(searchTerm)) return false;
    if (filterValue === 'all') return true;
    const stockKg = item.stockGrams / 1000;
    const usage = getDisplayAvg(item.id);
    const daysNum = usage > 0 ? stockKg / usage : (stockKg > 0 ? LARGE_DAYS : 0);
    const status = getStatus(daysNum, stockKg);
    if (filterValue === 'sufficient' && status !== 'sufficient') return false;
    if (filterValue === 'low' && status !== 'low') return false;
    if (filterValue === 'almostout' && status !== 'almostout') return false;
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No items found</td></tr>';
    return;
  }

  let html = '';
  filtered.forEach(item => {
    const stockKg = item.stockGrams / 1000;
    const usage = getDisplayAvg(item.id);
    const daysLeft = usage > 0 ? Math.round(stockKg / usage) : (stockKg > 0 ? '∞' : '0');
    const daysNum = usage > 0 ? stockKg / usage : (stockKg > 0 ? LARGE_DAYS : 0);
    const status = getStatus(daysNum, stockKg);

    let statusBadge = '', rowClass = '';
    if (status === 'sufficient') { statusBadge = '<span class="badge bg-success">Sufficient</span>'; }
    else if (status === 'low') { statusBadge = '<span class="badge bg-warning text-dark">Low</span>'; rowClass = 'table-warning'; }
    else if (status === 'almostout') { statusBadge = '<span class="badge bg-danger">Almost out</span>'; rowClass = 'table-danger'; }
    else { statusBadge = '<span class="badge bg-secondary">Unknown</span>'; }

    const avgCell = usage > 0 ? usage.toFixed(1) + ' kg' + (manualAvgUsage[item.id] ? ' ' : '') : '-';

    html += `<tr class="${rowClass}" data-id="${item.id}">
      <td class="fw-semibold text-nowrap">${item.name}</td>

      <td class="text-center text-nowrap">
        ${stockKg.toFixed(1)} kg
      </td>

      <td class="text-center text-nowrap">
        ${avgCell}
      </td>

      <td class="text-center fw-semibold text-nowrap">
        ${daysLeft}
      </td>

      <td class="text-center">
        ${statusBadge}
      </td>

      <td class="text-end text-nowrap">

        <!-- Desktop -->
        <div class="d-none d-md-inline-flex gap-1">
          <button class="btn btn-outline-warning btn-sm consume-btn" data-id="${item.id}">
            <i class="bi bi-arrow-down-circle"></i>
          </button>

          <button class="btn btn-outline-secondary btn-sm edit-btn" data-id="${item.id}">
            <i class="bi bi-pencil"></i>
          </button>

          <button class="btn btn-outline-info btn-sm history-btn" data-id="${item.id}">
            <i class="bi bi-clock"></i>
          </button>

          <button class="btn btn-outline-danger btn-sm delete-item-btn" data-id="${item.id}">
            <i class="bi bi-trash"></i>
          </button>
        </div>

        <!-- Mobile -->
        <div class="d-md-none">
          <div class="d-flex gap-1 mb-1">
            <button class="btn btn-outline-warning btn-sm w-50 consume-btn" data-id="${item.id}">
              <i class="bi bi-arrow-down-circle"></i>
            </button>

            <button class="btn btn-outline-secondary btn-sm w-50 edit-btn" data-id="${item.id}">
              <i class="bi bi-pencil"></i>
            </button>
          </div>

          <div class="d-flex gap-1">
            <button class="btn btn-outline-info btn-sm w-50 history-btn" data-id="${item.id}">
              <i class="bi bi-clock"></i>
            </button>

            <button class="btn btn-outline-danger btn-sm w-50 delete-item-btn" data-id="${item.id}">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>

      </td>
    </tr>`;
  });
  tbody.innerHTML = html;

  updateKPIs();
  updateAlert();
}

function updateKPIs() {
  let sufficient = 0, low = 0, almost = 0;
  feedItems.forEach(item => {
    const stockKg = item.stockGrams / 1000;
    const usage = getDisplayAvg(item.id);
    const daysNum = usage > 0 ? stockKg / usage : (stockKg > 0 ? LARGE_DAYS : 0);
    const status = getStatus(daysNum, stockKg);
    if (status === 'sufficient') sufficient++;
    else if (status === 'low') low++;
    else if (status === 'almostout') almost++;
  });
  totalItemsEl.textContent = feedItems.length;
  sufficientCountEl.textContent = sufficient;
  lowCountEl.textContent = low;
  almostOutCountEl.textContent = almost;
}

function updateAlert() {
  const lowAlmost = feedItems.filter(item => {
    const stockKg = item.stockGrams / 1000;
    const usage = getDisplayAvg(item.id);
    const daysNum = usage > 0 ? stockKg / usage : (stockKg > 0 ? LARGE_DAYS : 0);
    return getStatus(daysNum, stockKg) !== 'sufficient';
  }).length;
  alertMessageEl.textContent = `${lowAlmost} item(s) have low stock or are almost out.`;
}

// Gebruik van de laatste X dagen (widget) – X uit instellingen
export function renderUsage() {
  const settings = loadSettings();
  if (Object.keys(avgUsageCache).length === 0) {
    usageContainer.innerHTML = '<p class="text-muted">No consumption data available (no movements in the last ' + settings.avgDays + ' days).</p>';
    return;
  }
  let html = '';
  feedItems.forEach(item => {
    const usageKg = avgUsageCache[item.id];
    if (!usageKg) return;
    const totalPeriod = (usageKg * settings.avgDays).toFixed(1);
    html += `<div class="mb-2"><div class="d-flex justify-content-between"><span class="fw-semibold">${item.name}</span><span class="text-muted">${totalPeriod} kg total</span></div><div class="small text-muted">Average ${usageKg.toFixed(1)} kg/day</div></div>`;
  });
  if (html === '') html = '<p class="text-muted">No consumption recorded in the last ' + settings.avgDays + ' days.</p>';
  usageContainer.innerHTML = html;
}

// Tabel met alle bewegingen (laatste X dagen) voor het modal – X uit instellingen
export function renderUsageHistory() {
  const settings = loadSettings();
  const now = new Date();
  const cutoff = new Date(now.getTime() - settings.avgDays * 24 * 60 * 60 * 1000);
  const recentMovements = movements
    .filter(m => new Date(m.date) >= cutoff && m.deltaGrams < 0)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (recentMovements.length === 0) {
    usageHistoryTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No usage recorded in the last ' + settings.avgDays + ' days.</td></tr>';
    return;
  }

  let html = '';
  recentMovements.forEach(m => {
    const item = feedItems.find(i => i.id === m.feedItemId);
    const itemName = item ? item.name : `Unknown (${m.feedItemId})`;
    html += `<tr>
      <td class="text-nowrap">${new Date(m.date).toLocaleDateString()}</td>

      <td>
        <div class="fw-semibold">${itemName}</div>
        <div class="d-md-none small text-muted mt-1">
          Reason: ${m.reason || '-'}
        </div>
      </td>

      <td class="text-nowrap">${(-m.deltaGrams / 1000).toFixed(1)} kg</td>

      <td class="d-none d-md-table-cell">${m.reason || '-'}</td>

      <td class="text-end text-nowrap">
        <button class="btn btn-sm btn-outline-danger delete-movement-btn"
                data-id="${m.id}" title="Delete movement">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>`;
  });
  usageHistoryTableBody.innerHTML = html;
}

// Geschiedenis van één item tonen
export function showHistory(itemId) {
  const item = feedItems.find(i => i.id === itemId);
  if (!item) return;
  document.getElementById('historyItemName').textContent = item.name;
  const itemMovements = movements.filter(m => m.feedItemId === itemId && m.deltaGrams < 0).sort((a,b) => new Date(b.date) - new Date(a.date));
  let rows = '';
  itemMovements.forEach(m => {
    rows += `<tr><td>${new Date(m.date).toLocaleDateString()}</td><td>${(-m.deltaGrams / 1000).toFixed(1)} kg</td><td>${m.reason || '-'}</td></tr>`;
  });
  document.getElementById('historyTableBody').innerHTML = rows || '<tr><td colspan="3" class="text-muted text-center">No usage recorded</td></tr>';
  new bootstrap.Modal(document.getElementById('historyModal')).show();
}

// Foutmeldingen tonen/verbergen
export function showBackendError(message) {
  backendErrorEl.innerHTML = `<strong>Error loading items:</strong> ${message}`;
  backendErrorEl.classList.remove('d-none');
}

export function hideBackendError() {
  backendErrorEl.classList.add('d-none');
}

export function showMovementsWarning(message) {
  movementsErrorEl.innerHTML = `<strong>Warning:</strong> ${message}`;
  movementsErrorEl.classList.remove('d-none');
}

export function hideMovementsWarning() {
  movementsErrorEl.classList.add('d-none');
}

// NIEUW: labels bijwerken met de actuele periode
export function updatePeriodLabels() {
  const settings = loadSettings();
  const days = settings.avgDays;
  const periodLabel = document.getElementById('usagePeriodLabel');
  if (periodLabel) {
    periodLabel.innerHTML = `<i class="bi bi-graph-down me-2"></i>Usage last ${days} days`;
  }
  const modalTitle = document.getElementById('usageHistoryModalTitle');
  if (modalTitle) {
    modalTitle.innerHTML = `<i class="bi bi-list-ul me-2"></i>Usage history (last ${days} days)`;
  }
}