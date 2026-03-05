// main.js
import { API_BASE, LARGE_DAYS, getToken } from './config.js';
import {
  fetchFeedItems, fetchMovements, createFeedItem, patchFeedItem,
  deleteFeedItem, createMovement, deleteMovement as apiDeleteMovement
} from './api.js';
import {
  feedItems, setFeedItems, movements, setMovements,
  manualAvgUsage, updateManualAvg, isDuplicateName,
  getDisplayAvg, getStatus
} from './state.js';
import {
  renderTable, renderUsage, renderUsageHistory, showHistory,
  showMessage, showBackendError, hideBackendError,
  showMovementsWarning, hideMovementsWarning
} from './ui.js';

// Globale variabelen voor modals
let currentEditId = null;
let currentConsumeId = null;
let currentDeleteMovementId = null;
let currentDeleteItemId = null;

// Data ophalen
async function loadFeedItems() {
  try {
    const items = await fetchFeedItems();
    setFeedItems(items);
    renderTable();
    renderUsage();
    hideBackendError();
  } catch (err) {
    showBackendError(err.message);
  }
}

async function loadMovements() {
  try {
    const movs = await fetchMovements();
    setMovements(movs); // zorgt ook voor herberekening van avgUsageCache
    renderTable();
    renderUsage();
    hideMovementsWarning();
  } catch (err) {
    console.error('movements error', err);
    showMovementsWarning('Could not load usage history. Average consumption may be outdated.');
  }
}

// CRUD acties
async function addItem(name, stockKg, manualAvg) {
  const stockGrams = Math.round(stockKg * 1000);
  const newItem = await createFeedItem(name, stockGrams);
  // Voeg toe aan state
  const updated = [...feedItems, newItem];
  setFeedItems(updated);
  if (manualAvg > 0) {
    updateManualAvg(newItem.id, manualAvg);
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
    await patchFeedItem(id, updates);
    // Pas local state aan
    const updatedItems = feedItems.map(i =>
      i.id === id ? { ...i, ...updates } : i
    );
    setFeedItems(updatedItems);
  }

  updateManualAvg(id, manualAvg);
  renderTable();
  renderUsage();
  showMessage('Item updated');
}

async function deleteItem(id) {
  await deleteFeedItem(id);
  const updatedItems = feedItems.filter(i => i.id !== id);
  setFeedItems(updatedItems);
  // movements worden apart gefilterd (via setMovements)
  const updatedMovements = movements.filter(m => m.feedItemId !== id);
  setMovements(updatedMovements); // triggert herberekening
  updateManualAvg(id, 0); // verwijderd handmatige waarde
  renderTable();
  renderUsage();
  showMessage('Item deleted');
}

async function addConsumption(feedItemId, date, amountKg, reason) {
  const deltaGrams = -Math.round(amountKg * 1000);
  await createMovement(feedItemId, date, deltaGrams, reason);
  // Herlaad movements en items (de stock is op de server aangepast)
  await loadMovements();
  await loadFeedItems();
  showMessage('Usage logged');
}

async function deleteMovement(id) {
  await apiDeleteMovement(id);
  await loadMovements();
  await loadFeedItems();
  showMessage('Movement deleted');
}

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', () => {
  // Modals tonen bij klikken op knoppen (event delegation)
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
    else if (btn.classList.contains('delete-movement-btn')) {
      const movementId = Number(btn.dataset.id);
      currentDeleteMovementId = movementId;
      new bootstrap.Modal(document.getElementById('confirmDeleteMovementModal')).show();
    }
    else if (btn.classList.contains('delete-item-btn')) {
      const itemId = Number(btn.dataset.id);
      currentDeleteItemId = itemId;
      new bootstrap.Modal(document.getElementById('confirmDeleteItemModal')).show();
    }
  });

  // Modals die bij openen data verversen
  document.getElementById('usageHistoryModal').addEventListener('show.bs.modal', renderUsageHistory);

  // Confirm delete movement
  document.getElementById('confirmDeleteMovementBtn').addEventListener('click', async () => {
    if (currentDeleteMovementId) {
      await deleteMovement(currentDeleteMovementId);
      currentDeleteMovementId = null;
      bootstrap.Modal.getInstance(document.getElementById('confirmDeleteMovementModal')).hide();
      renderUsageHistory(); // update de tabel in het modal
    }
  });

  // Confirm delete item
  document.getElementById('confirmDeleteItemBtn').addEventListener('click', async () => {
    if (currentDeleteItemId) {
      await deleteItem(currentDeleteItemId);
      currentDeleteItemId = null;
      bootstrap.Modal.getInstance(document.getElementById('confirmDeleteItemModal')).hide();
    }
  });

  // Save edit
  document.getElementById('saveEditBtn').addEventListener('click', async () => {
    if (!currentEditId) return;
    const name = document.getElementById('editItemName').value.trim();
    const stock = parseFloat(document.getElementById('editCurrentStock').value);
    const manual = parseFloat(document.getElementById('editManualAvg').value) || 0;
    if (!name || isNaN(stock) || stock < 0) { alert('Invalid input'); return; }
    if (isDuplicateName(name, currentEditId)) {
      showMessage('An item with this name already exists. Please use a different name.', true);
      return;
    }
    await updateItem(currentEditId, name, stock, manual);
    bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
  });

  // Save consumption
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
    if (isDuplicateName(name)) {
      showMessage('An item with this name already exists. Please use a different name.', true);
      return;
    }
    await addItem(name, stock, manual);
    document.getElementById('addItemName').value = '';
    document.getElementById('addInitialStock').value = '';
    document.getElementById('addManualAvg').value = '0';
    bootstrap.Modal.getInstance(document.getElementById('addModal')).hide();
  });

  // Filters
  document.getElementById('searchInput').addEventListener('input', renderTable);
  document.getElementById('statusFilter').addEventListener('change', renderTable);

  // Start
  loadFeedItems();
  loadMovements();
  setInterval(() => {
    loadFeedItems();
    loadMovements();
  }, 30000);
});