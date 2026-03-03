(function() {
  const API_BASE = 'http://localhost:3001';

  function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    };
    const res = await fetch(API_BASE + endpoint, { ...options, headers });
    if (!res.ok) {
      let errorText = `HTTP error ${res.status}`;
      try {
        const errData = await res.json();
        errorText = errData.error || errorText;
      } catch (e) {}
      throw new Error(errorText);
    }
    return res.json();
  }

  function showMessage(text) {
    const msg = document.getElementById('simpleMessage');
    msg.textContent = '✔️ ' + text;
    msg.style.display = 'block';
    setTimeout(() => { msg.style.display = 'none'; }, 2500);
  }

  let feedItems = [];
  let movements = [];
  let manualAvgUsage = JSON.parse(localStorage.getItem('inventory_manual_avg') || '{}');

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

  let currentEditId = null;
  let currentConsumeId = null;
  let currentDeleteMovementId = null;
  let currentDeleteItemId = null;

  function getStatus(daysLeft, stockKg) {
    if (stockKg <= 0) return 'almostout';
    if (daysLeft === null || daysLeft === undefined) return 'unknown';
    if (daysLeft <= 3) return 'almostout';
    if (daysLeft <= 7) return 'low';
    return 'sufficient';
  }

  function getAvgFromMovements() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const usageGrams = {};
    movements.forEach(m => {
      const movDate = new Date(m.date);
      if (movDate >= thirtyDaysAgo && m.deltaGrams < 0) {
        const id = m.feedItemId;
        usageGrams[id] = (usageGrams[id] || 0) + Math.abs(m.deltaGrams);
      }
    });
    const avgKg = {};
    Object.keys(usageGrams).forEach(id => {
      avgKg[id] = usageGrams[id] / 1000 / 30;
    });
    return avgKg;
  }

  function getDisplayAvg(itemId) {
    if (manualAvgUsage[itemId] && manualAvgUsage[itemId] > 0) {
      return manualAvgUsage[itemId];
    }
    const fromMovements = getAvgFromMovements();
    return fromMovements[itemId] || 0;
  }

  function renderTable() {
    const searchTerm = searchInput.value.toLowerCase();
    const filterValue = statusFilter.value;

    const filtered = feedItems.filter(item => {
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm)) return false;
      if (filterValue === 'all') return true;
      const stockKg = item.stockGrams / 1000;
      const usage = getDisplayAvg(item.id);
      const daysNum = usage > 0 ? stockKg / usage : (stockKg > 0 ? 999 : 0);
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
      const daysLeft = usage > 0 ? (stockKg / usage).toFixed(1) : (stockKg > 0 ? '∞' : '0');
      const daysNum = usage > 0 ? stockKg / usage : (stockKg > 0 ? 999 : 0);
      const status = getStatus(daysNum, stockKg);

      let statusBadge = '', rowClass = '';
      if (status === 'sufficient') { statusBadge = '<span class="badge bg-success">Sufficient</span>'; }
      else if (status === 'low') { statusBadge = '<span class="badge bg-warning text-dark">Low</span>'; rowClass = 'table-warning'; }
      else if (status === 'almostout') { statusBadge = '<span class="badge bg-danger">Almost out</span>'; rowClass = 'table-danger'; }
      else { statusBadge = '<span class="badge bg-secondary">Unknown</span>'; }

      const avgCell = usage > 0 ? usage.toFixed(1) + ' kg' + (manualAvgUsage[item.id] ? ' ✏️' : '') : '-';

      html += `<tr class="${rowClass}" data-id="${item.id}">
        <td><div class="fw-semibold">${item.name}</div><div class="text-muted small">ID: ${item.id}</div></td>
        <td>${stockKg.toFixed(1)} kg</td>
        <td>${avgCell}</td>
        <td class="fw-semibold">${daysLeft}</td>
        <td>${statusBadge}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-warning consume-btn me-1" data-id="${item.id}" title="Log usage"><i class="bi bi-arrow-down-circle"></i></button>
          <button class="btn btn-sm btn-outline-secondary edit-btn me-1" data-id="${item.id}" title="Edit item"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-info history-btn me-1" data-id="${item.id}" title="History"><i class="bi bi-clock-history"></i></button>
          <button class="btn btn-sm btn-outline-danger delete-item-btn" data-id="${item.id}" title="Delete item"><i class="bi bi-trash"></i></button>
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
      const daysNum = usage > 0 ? stockKg / usage : (stockKg > 0 ? 999 : 0);
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
      const daysNum = usage > 0 ? stockKg / usage : (stockKg > 0 ? 999 : 0);
      return getStatus(daysNum, stockKg) !== 'sufficient';
    }).length;
    alertMessageEl.textContent = `${lowAlmost} item(s) have low stock or are almost out.`;
  }

  function renderUsage() {
    const avgFromMovements = getAvgFromMovements();
    if (Object.keys(avgFromMovements).length === 0) {
      usageContainer.innerHTML = '<p class="text-muted">No consumption data available (no movements yet).</p>';
      return;
    }
    let html = '';
    feedItems.forEach(item => {
      const usageKg = avgFromMovements[item.id];
      if (!usageKg) return;
      const total30d = (usageKg * 30).toFixed(1);
      html += `<div class="mb-2"><div class="d-flex justify-content-between"><span class="fw-semibold">${item.name}</span><span class="text-muted">${total30d} kg total</span></div><div class="small text-muted">Average ${usageKg.toFixed(1)} kg/day</div></div>`;
    });
    if (html === '') html = '<p class="text-muted">No consumption recorded in the last 30 days.</p>';
    usageContainer.innerHTML = html;
  }

  function renderUsageHistory() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentMovements = movements
      .filter(m => new Date(m.date) >= thirtyDaysAgo && m.deltaGrams < 0)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (recentMovements.length === 0) {
      usageHistoryTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No usage recorded in the last 30 days.</td></tr>';
      return;
    }

    let html = '';
    recentMovements.forEach(m => {
      const item = feedItems.find(i => i.id === m.feedItemId);
      const itemName = item ? item.name : `Unknown (${m.feedItemId})`;
      html += `<tr>
        <td>${new Date(m.date).toLocaleDateString()}</td>
        <td>${itemName}</td>
        <td>${(-m.deltaGrams / 1000).toFixed(1)} kg</td>
        <td>${m.reason || '-'}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger delete-movement-btn" data-id="${m.id}" title="Delete movement"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`;
    });
    usageHistoryTableBody.innerHTML = html;
  }

  async function loadFeedItems() {
    try {
      feedItems = await apiFetch('/inventory/feed-items');
      renderTable();
      renderUsage();
    } catch (err) {
      document.getElementById('backendError').innerHTML = `<strong>Error:</strong> ${err.message}`;
      document.getElementById('backendError').classList.remove('d-none');
    }
  }

  async function loadMovements() {
    try {
      movements = await apiFetch('/inventory/movements');
      renderTable();
      renderUsage();
    } catch (err) {
      console.error('movements error', err);
    }
  }

  async function addItem(name, stockKg, manualAvg) {
    const stockGrams = Math.round(stockKg * 1000);
    const newItem = await apiFetch('/inventory/feed-items', {
      method: 'POST',
      body: JSON.stringify({ name, stockGrams })
    });
    feedItems.push(newItem);
    if (manualAvg > 0) {
      manualAvgUsage[newItem.id] = manualAvg;
      localStorage.setItem('inventory_manual_avg', JSON.stringify(manualAvgUsage));
    }
    renderTable();
    renderUsage();
    showMessage('Item added');
  }

  async function updateItem(id, name, stockKg, manualAvg) {
    const item = feedItems.find(i => i.id === id);
    if (!item) return;

    const updates = {};
    if (name !== item.name) updates.name = name;
    const newGrams = Math.round(stockKg * 1000);
    if (newGrams !== item.stockGrams) updates.stockGrams = newGrams;

    if (Object.keys(updates).length > 0) {
      await apiFetch(`/inventory/feed-items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      if (updates.name) item.name = updates.name;
      if (updates.stockGrams) item.stockGrams = updates.stockGrams;
    }

    if (manualAvg > 0) {
      manualAvgUsage[id] = manualAvg;
    } else {
      delete manualAvgUsage[id];
    }
    localStorage.setItem('inventory_manual_avg', JSON.stringify(manualAvgUsage));
    renderTable();
    renderUsage();
    showMessage('Item updated');
  }

  async function deleteItem(id) {
    await apiFetch(`/inventory/feed-items/${id}`, { method: 'DELETE' });
    feedItems = feedItems.filter(i => i.id !== id);
    movements = movements.filter(m => m.feedItemId !== id);
    delete manualAvgUsage[id];
    localStorage.setItem('inventory_manual_avg', JSON.stringify(manualAvgUsage));
    renderTable();
    renderUsage();
    showMessage('Item deleted');
  }

  async function addConsumption(feedItemId, date, amountKg, reason) {
    const deltaGrams = -Math.round(amountKg * 1000);
    await apiFetch('/inventory/movements', {
      method: 'POST',
      body: JSON.stringify({ feedItemId, date, deltaGrams, reason })
    });
    await loadMovements();
    await loadFeedItems();
    showMessage('Usage logged');
  }

  async function deleteMovement(id) {
    await apiFetch(`/inventory/movements/${id}`, { method: 'DELETE' });
    await loadMovements();
    await loadFeedItems();
    showMessage('Movement deleted');
  }

  function showHistory(itemId) {
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

  // ========== EVENT LISTENERS ==========
  // Open usage history modal en vul data
  document.getElementById('usageHistoryModal').addEventListener('show.bs.modal', function () {
    renderUsageHistory();
  });

  // Delete movement knop (via event delegation omdat de tabel dynamisch is)
  document.addEventListener('click', (e) => {
    const deleteMovementBtn = e.target.closest('.delete-movement-btn');
    if (deleteMovementBtn) {
      const movementId = Number(deleteMovementBtn.dataset.id);
      currentDeleteMovementId = movementId;
      const confirmModal = new bootstrap.Modal(document.getElementById('confirmDeleteMovementModal'));
      confirmModal.show();
    }
  });

  // Bevestig verwijderen movement
  document.getElementById('confirmDeleteMovementBtn').addEventListener('click', async () => {
    if (currentDeleteMovementId) {
      await deleteMovement(currentDeleteMovementId);
      currentDeleteMovementId = null;
      bootstrap.Modal.getInstance(document.getElementById('confirmDeleteMovementModal')).hide();
      renderUsageHistory();
    }
  });

  // Delete item knop
  document.addEventListener('click', (e) => {
    const deleteItemBtn = e.target.closest('.delete-item-btn');
    if (deleteItemBtn) {
      const itemId = Number(deleteItemBtn.dataset.id);
      currentDeleteItemId = itemId;
      const confirmModal = new bootstrap.Modal(document.getElementById('confirmDeleteItemModal'));
      confirmModal.show();
    }
  });

  // Bevestig verwijderen item
  document.getElementById('confirmDeleteItemBtn').addEventListener('click', async () => {
    if (currentDeleteItemId) {
      await deleteItem(currentDeleteItemId);
      currentDeleteItemId = null;
      bootstrap.Modal.getInstance(document.getElementById('confirmDeleteItemModal')).hide();
    }
  });

  // Andere knoppen (bewerken, verbruik, geschiedenis)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = Number(btn.dataset.id);

    if (btn.classList.contains('edit-btn')) {
      const item = feedItems.find(i => i.id === id);
      if (!item) return;
      currentEditId = id;
      document.getElementById('editItemName').value = item.name;
      document.getElementById('editCurrentStock').value = (item.stockGrams / 1000).toFixed(1);
      document.getElementById('editManualAvg').value = manualAvgUsage[id] || '';
      new bootstrap.Modal(document.getElementById('editModal')).show();
    }
    else if (btn.classList.contains('consume-btn')) {
      currentConsumeId = id;
      document.getElementById('consumeDate').value = new Date().toISOString().split('T')[0];
      document.getElementById('consumeAmount').value = '';
      document.getElementById('consumeReason').value = '';
      new bootstrap.Modal(document.getElementById('consumeModal')).show();
    }
    else if (btn.classList.contains('history-btn')) {
      showHistory(id);
    }
  });

  // Opslaan bewerkingen (edit)
  document.getElementById('saveEditBtn').addEventListener('click', async () => {
    if (!currentEditId) return;
    const name = document.getElementById('editItemName').value.trim();
    const stock = parseFloat(document.getElementById('editCurrentStock').value);
    const manual = parseFloat(document.getElementById('editManualAvg').value) || 0;
    if (!name || isNaN(stock) || stock < 0) { alert('Invalid input'); return; }
    await updateItem(currentEditId, name, stock, manual);
    bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
  });

  // Opslaan verbruik
  document.getElementById('saveConsumeBtn').addEventListener('click', async () => {
    if (!currentConsumeId) return;
    const date = document.getElementById('consumeDate').value;
    const amount = parseFloat(document.getElementById('consumeAmount').value);
    const reason = document.getElementById('consumeReason').value.trim() || 'Manual';
    if (!date || isNaN(amount) || amount <= 0) { alert('Invalid input'); return; }
    await addConsumption(currentConsumeId, date, amount, reason);
    bootstrap.Modal.getInstance(document.getElementById('consumeModal')).hide();
  });

  // Add item
  document.getElementById('saveAddBtn').addEventListener('click', async () => {
    const name = document.getElementById('addItemName').value.trim();
    const stock = parseFloat(document.getElementById('addInitialStock').value);
    const manual = parseFloat(document.getElementById('addManualAvg').value) || 0;
    if (!name || isNaN(stock) || stock < 0) { alert('Invalid input'); return; }
    await addItem(name, stock, manual);
    document.getElementById('addItemName').value = '';
    document.getElementById('addInitialStock').value = '';
    document.getElementById('addManualAvg').value = '0';
    bootstrap.Modal.getInstance(document.getElementById('addModal')).hide();
  });

  // Filters
  searchInput.addEventListener('input', renderTable);
  statusFilter.addEventListener('change', renderTable);

  // ========== INIT ==========
  loadFeedItems();
  loadMovements();
  setInterval(() => {
    loadFeedItems();
    loadMovements();
  }, 30000);
})();