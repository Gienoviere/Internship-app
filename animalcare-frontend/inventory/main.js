// main.js
import { API_BASE, LARGE_DAYS, getToken } from './config.js';
import {
  fetchFeedItems, fetchMovements, createFeedItem, patchFeedItem,
  deleteFeedItem, createMovement, deleteMovement as apiDeleteMovement
} from './api.js';
import {
  feedItems, setFeedItems, movements, setMovements,
  manualAvgUsage, updateManualAvg, isDuplicateName,
  getDisplayAvg, getStatus, recomputeAvgUsageCache
} from './state.js';
import {
  renderTable, renderUsage, renderUsageHistory, showHistory,
  showMessage, showBackendError, hideBackendError,
  showMovementsWarning, hideMovementsWarning, updatePeriodLabels
} from './ui.js';
import { loadSettings, saveSettings } from './settings.js';
import { wireQuickLogShared } from "/js/quick-log.js";

console.log("main.js loaded");
window.testGoogleLoaded = true;

// code for user badge, made by gienoviere, don't touch it!!
async function syncNavbarUser() {
  try {
    const token = getToken();
    const badge = document.getElementById("userRoleBadge3");
    const logoutBtn = document.getElementById("btnLogout3");

    if (!token) {
      if (badge) badge.textContent = "Not logged in";
      if (logoutBtn) logoutBtn.classList.add("d-none");
      return;
    }

    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error("Failed to load current user");
    }

    const me = await res.json();
    const currentUser = me.user || me;

    if (badge) {
      badge.textContent = currentUser?.role || "Unknown role";
    }

    if (logoutBtn) {
      logoutBtn.classList.remove("d-none");
      logoutBtn.onclick = () => {
        localStorage.removeItem("token");
        window.location.reload();
      };
    }
  } catch (err) {
    console.error("Navbar auth sync failed:", err);
    const badge = document.getElementById("userRoleBadge3");
    const logoutBtn = document.getElementById("btnLogout3");
    if (badge) badge.textContent = "Not logged in";
    if (logoutBtn) logoutBtn.classList.add("d-none");
  }
}

// Globale variabelen voor modals
let currentEditId = null;
let currentConsumeId = null;
let currentAddStockId = null;
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
  const updatedMovements = movements.filter(m => m.feedItemId !== id);
  setMovements(updatedMovements);
  updateManualAvg(id, 0);
  renderTable();
  renderUsage();
  showMessage('Item deleted');
}

async function addConsumption(feedItemId, date, amountKg, reason) {
  const deltaGrams = -Math.round(amountKg * 1000);
  await createMovement(feedItemId, date, deltaGrams, reason);
  await loadMovements();
  await loadFeedItems();
  showMessage('Usage logged');
}

async function addStock(feedItemId, date, amountKg, reason) {
  const deltaGrams = Math.round(amountKg * 1000); // positief!
  await createMovement(feedItemId, date, deltaGrams, reason);
  await loadMovements();
  await loadFeedItems();
  showMessage('Stock added');
}

async function deleteMovement(id) {
  await apiDeleteMovement(id);
  await loadMovements();
  await loadFeedItems();
  showMessage('Movement deleted');
}

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', () => {
  // Code for the button to connect the google calende
  const googleBtn = document.getElementById("btnConnectGoogleCalendar");

if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    alert("Google button clicked");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("No token found. Please log in again.");
        return;
      }

      const res = await fetch(`${API_BASE}/google-calendar/connect`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      alert(`Response status: ${res.status}`);

      if (!res.ok) {
        const text = await res.text();
        console.error("Connect failed:", text);
        alert("Connect request failed");
        return;
      }

      const data = await res.json();
      console.log("Google connect data:", data);

      if (data.url) {
        window.open(data.url, "googleAuth", "width=520,height=700");
      } else {
        alert("No URL returned from backend");
      }
    } catch (err) {
      console.error("Google Calendar error:", err);
      alert("Google Calendar crashed");
    }
  });
} else {
  console.error("btnConnectGoogleCalendar not found");
}
// quick logs, made bij gienoviere
  wireQuickLogShared(async () => {
    window.location.reload();
  });


  //User badge check, made by gienoviere, leave it!!  
  setTimeout(() => {
    syncNavbarUser();
  }, 300);

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
    else if (btn.classList.contains('add-stock-btn')) {
      currentAddStockId = id;
      document.getElementById('addStockDate').value = new Date().toISOString().split('T')[0];
      document.getElementById('addStockAmount').value = '';
      document.getElementById('addStockReason').value = '';
      new bootstrap.Modal(document.getElementById('addStockModal')).show();
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
    const errorDiv = document.getElementById('editError');
    const errorText = document.getElementById('editErrorText');
    errorDiv.style.display = 'none';

    if (!currentEditId) return;

    const name = document.getElementById('editItemName').value.trim();
    const stock = parseFloat(document.getElementById('editCurrentStock').value);
    const manual = parseFloat(document.getElementById('editManualAvg').value) || 0;

    if (!name) {
      errorText.textContent = 'Item name is required.';
      errorDiv.style.display = 'block';
      return;
    }
    if (isNaN(stock) || stock < 0) {
      errorText.textContent = 'Stock must be a non‑negative number.';
      errorDiv.style.display = 'block';
      return;
    }
    if (isDuplicateName(name, currentEditId)) {
      errorText.textContent = 'An item with this name already exists. Please use a different name.';
      errorDiv.style.display = 'block';
      return;
    }

    await updateItem(currentEditId, name, stock, manual);
    bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
  });

  // Save consumption
  document.getElementById('saveConsumeBtn').addEventListener('click', async () => {
    const errorDiv = document.getElementById('consumeError');
    const errorText = document.getElementById('consumeErrorText');
    errorDiv.style.display = 'none';

    if (!currentConsumeId) return;

    const date = document.getElementById('consumeDate').value;
    const amount = parseFloat(document.getElementById('consumeAmount').value);
    const reason = document.getElementById('consumeReason').value.trim() || 'Manual';

    if (!date) {
      errorText.textContent = 'Please select a date.';
      errorDiv.style.display = 'block';
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      errorText.textContent = 'Please enter a valid positive amount.';
      errorDiv.style.display = 'block';
      return;
    }

    await addConsumption(currentConsumeId, date, amount, reason);
    bootstrap.Modal.getInstance(document.getElementById('consumeModal')).hide();
  });

  // Save add stock (per item)
  document.getElementById('saveAddStockBtn').addEventListener('click', async () => {
    const errorDiv = document.getElementById('addStockError');
    const errorText = document.getElementById('addStockErrorText');
    errorDiv.style.display = 'none';

    if (!currentAddStockId) return;

    const date = document.getElementById('addStockDate').value;
    const amount = parseFloat(document.getElementById('addStockAmount').value);
    const reason = document.getElementById('addStockReason').value.trim() || 'Restock';

    if (!date) {
      errorText.textContent = 'Please select a date.';
      errorDiv.style.display = 'block';
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      errorText.textContent = 'Please enter a valid positive amount.';
      errorDiv.style.display = 'block';
      return;
    }

    await addStock(currentAddStockId, date, amount, reason);
    bootstrap.Modal.getInstance(document.getElementById('addStockModal')).hide();
  });

  // Add item
  document.getElementById('saveAddBtn').addEventListener('click', async () => {
    const errorDiv = document.getElementById('addError');
    const errorText = document.getElementById('addErrorText');
    errorDiv.style.display = 'none';

    const name = document.getElementById('addItemName').value.trim();
    const stock = parseFloat(document.getElementById('addInitialStock').value);
    const manual = parseFloat(document.getElementById('addManualAvg').value) || 0;

    if (!name) {
      errorText.textContent = 'Item name is required.';
      errorDiv.style.display = 'block';
      return;
    }
    if (isNaN(stock) || stock < 0) {
      errorText.textContent = 'Initial stock must be a non‑negative number.';
      errorDiv.style.display = 'block';
      return;
    }
    if (isDuplicateName(name)) {
      errorText.textContent = 'An item with this name already exists. Please use a different name.';
      errorDiv.style.display = 'block';
      return;
    }

    await addItem(name, stock, manual);
    document.getElementById('addItemName').value = '';
    document.getElementById('addInitialStock').value = '';
    document.getElementById('addManualAvg').value = '0';
    bootstrap.Modal.getInstance(document.getElementById('addModal')).hide();
  });

  // ---- Settings modal ----
  const settingsModalEl = document.getElementById('settingsModal');
  const settingsForm = document.getElementById('settingsForm');
  const settingsFormError = document.getElementById('settingsFormError');

  const lowInput = document.getElementById('settingsLowThreshold');
  const almostInput = document.getElementById('settingsAlmostOutThreshold');
  const avgInput = document.getElementById('settingsAvgDays');

  const lowFeedback = document.getElementById('lowThresholdFeedback');
  const almostFeedback = document.getElementById('almostOutThresholdFeedback');
  const avgFeedback = document.getElementById('avgDaysFeedback');

  // Helper om een veld te valideren op positief geheel getal
  function validatePositiveInt(input, feedbackEl) {
    const value = parseInt(input.value, 10);
    if (isNaN(value) || value < 1 || !Number.isInteger(value)) {
      input.classList.add('is-invalid');
      feedbackEl.textContent = 'Please enter a valid positive whole number.';
      return false;
    } else {
      input.classList.remove('is-invalid');
      feedbackEl.textContent = 'Please enter a valid positive number.';
      return true;
    }
  }

  // Reset bij openen modal
  settingsModalEl.addEventListener('show.bs.modal', () => {
    [lowInput, almostInput, avgInput].forEach(input => {
      input.classList.remove('is-invalid');
    });
    lowFeedback.textContent = 'Please enter a valid positive number.';
    almostFeedback.textContent = 'Please enter a valid positive number.';
    avgFeedback.textContent = 'Please enter a valid positive number.';
    settingsFormError.classList.add('d-none');

    const settings = loadSettings();
    lowInput.value = settings.lowThreshold;
    almostInput.value = settings.almostOutThreshold;
    avgInput.value = settings.avgDays;
  });

  document.getElementById('saveSettingsBtn').addEventListener('click', (e) => {
    e.preventDefault();

    const lowValid = validatePositiveInt(lowInput, lowFeedback);
    const almostValid = validatePositiveInt(almostInput, almostFeedback);
    const avgValid = validatePositiveInt(avgInput, avgFeedback);

    if (!lowValid || !almostValid || !avgValid) {
      return;
    }

    const low = parseInt(lowInput.value, 10);
    const almost = parseInt(almostInput.value, 10);
    const avgDays = parseInt(avgInput.value, 10);

    if (almost > low) {
      lowInput.classList.add('is-invalid');
      almostInput.classList.add('is-invalid');
      lowFeedback.textContent = 'Low threshold must be greater than or equal to almost out threshold.';
      almostFeedback.textContent = 'Almost out threshold must be less than or equal to low threshold.';
      return;
    } else {
      lowInput.classList.remove('is-invalid');
      almostInput.classList.remove('is-invalid');
      lowFeedback.textContent = 'Please enter a valid positive number.';
      almostFeedback.textContent = 'Please enter a valid positive number.';
    }

    saveSettings({ lowThreshold: low, almostOutThreshold: almost, avgDays });

    recomputeAvgUsageCache();

    renderTable();
    renderUsage();
    if (document.getElementById('usageHistoryModal').classList.contains('show')) {
      renderUsageHistory();
    }
    updatePeriodLabels();

    bootstrap.Modal.getInstance(settingsModalEl).hide();
    showMessage('Settings saved');
  });

  // Filters
  document.getElementById('searchInput').addEventListener('input', renderTable);
  document.getElementById('statusFilter').addEventListener('change', renderTable);

  // Start
  loadFeedItems();
  loadMovements();
  updatePeriodLabels();

  setInterval(() => {
    loadFeedItems();
    loadMovements();
  }, 30000);

  // === Inventory Update Modal (via sidebar) ===
  const inventoryUpdateModal = document.getElementById('inventoryUpdateModal');
  const updateStockSelect = document.getElementById('updateStockItemId');
  const saveUpdateStockBtn = document.getElementById('saveUpdateStockBtn');

  if (inventoryUpdateModal && updateStockSelect && saveUpdateStockBtn) {
    inventoryUpdateModal.addEventListener('show.bs.modal', () => {
      updateStockSelect.innerHTML = '<option value="">Select an item...</option>';
      feedItems.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = `${item.name} (current: ${(item.stockGrams / 1000).toFixed(1)} kg)`;
        updateStockSelect.appendChild(option);
      });
      document.getElementById('updateStockDate').value = new Date().toISOString().split('T')[0];
      document.getElementById('updateStockAmount').value = '';
      document.getElementById('updateStockReason').value = '';
    });

    saveUpdateStockBtn.addEventListener('click', async () => {
      const errorDiv = document.getElementById('updateStockError');
      const errorText = document.getElementById('updateStockErrorText');
      errorDiv.style.display = 'none';

      const itemId = parseInt(updateStockSelect.value);
      const date = document.getElementById('updateStockDate').value;
      const amount = parseFloat(document.getElementById('updateStockAmount').value);
      const reason = document.getElementById('updateStockReason').value.trim() || 'Restock';

      if (!itemId) {
        errorText.textContent = 'Please select an item.';
        errorDiv.style.display = 'block';
        return;
      }
      if (!date) {
        errorText.textContent = 'Please select a date.';
        errorDiv.style.display = 'block';
        return;
      }
      if (isNaN(amount) || amount <= 0) {
        errorText.textContent = 'Please enter a valid positive amount.';
        errorDiv.style.display = 'block';
        return;
      }

      await addStock(itemId, date, amount, reason);
      bootstrap.Modal.getInstance(inventoryUpdateModal).hide();
    });
  } else {
    console.warn('Inventory Update Modal elements not found – check IDs in HTML');
  }
});

// connector for google calender
window.connectGoogleCalendar = async function () {
  try {
    alert("Google button clicked");

    const token = localStorage.getItem("token");

    if (!token) {
      alert("No token found. Please log in again.");
      return;
    }

    const res = await fetch(`${API_BASE}/google-calendar/connect`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    alert(`Response status: ${res.status}`);

    if (!res.ok) {
      const text = await res.text();
      console.error("Connect failed:", text);
      alert("Connect request failed");
      return;
    }

    const data = await res.json();
    console.log("Google connect data:", data);

    if (data.url) {
      window.open(data.url, "_blank", "width=520,height=700");
    } else {
      alert("No URL returned from backend");
    }
  } catch (err) {
    console.error("Google Calendar error:", err);
    alert("Google Calendar crashed");
  }
};