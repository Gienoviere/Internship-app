// state.js
import { LARGE_DAYS } from './config.js';
import { loadSettings } from './settings.js';

// Globale variabelen
export let feedItems = [];
export let movements = [];
export let manualAvgUsage = JSON.parse(localStorage.getItem('inventory_manual_avg') || '{}');
export let avgUsageCache = {};

// Hulpfuncties om de state te wijzigen
export function setFeedItems(newItems) {
  feedItems = newItems;
}

export function setMovements(newMovements) {
  movements = newMovements;
  recomputeAvgUsageCache(); // bijwerken van de cache zodra movements veranderen
}

export function updateManualAvg(id, value) {
  if (value > 0) {
    manualAvgUsage[id] = value;
  } else {
    delete manualAvgUsage[id];
  }
  localStorage.setItem('inventory_manual_avg', JSON.stringify(manualAvgUsage));
}

// Cache opnieuw berekenen op basis van movements (periode uit instellingen)
export function recomputeAvgUsageCache() {
  const settings = loadSettings();
  const days = settings.avgDays;
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const usageGrams = {};
  movements.forEach(m => {
    const movDate = new Date(m.date);
    if (movDate >= cutoff && m.deltaGrams < 0) {
      const id = m.feedItemId;
      usageGrams[id] = (usageGrams[id] || 0) + Math.abs(m.deltaGrams);
    }
  });
  const newCache = {};
  Object.keys(usageGrams).forEach(id => {
    newCache[id] = usageGrams[id] / 1000 / days; // kg per dag
  });
  avgUsageCache = newCache;
}

// Gemiddeld gebruik dat getoond moet worden (handmatig of uit cache)
export function getDisplayAvg(itemId) {
  if (manualAvgUsage[itemId] && manualAvgUsage[itemId] > 0) {
    return manualAvgUsage[itemId];
  }
  return avgUsageCache[itemId] || 0;
}

// Controle op dubbele naam (hoofdletterongevoelig)
export function isDuplicateName(name, excludeId = null) {
  const normalized = name.trim().toLowerCase();
  return feedItems.some(item => 
    item.name.toLowerCase() === normalized && (excludeId === null || item.id !== excludeId)
  );
}

// Statusbepaling op basis van dagen, voorraad en drempelwaarden uit instellingen
export function getStatus(daysLeft, stockKg) {
  const settings = loadSettings();
  if (stockKg <= 0) return 'almostout';
  if (daysLeft === null || daysLeft === undefined) return 'unknown';
  if (daysLeft <= settings.almostOutThreshold) return 'almostout';
  if (daysLeft <= settings.lowThreshold) return 'low';
  return 'sufficient';
}