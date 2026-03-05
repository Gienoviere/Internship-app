// state.js
import { LARGE_DAYS } from './config.js';

// Globale variabelen (rechtstreeks exporten is leesbaar, maar je kunt ook een object gebruiken)
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

// Cache opnieuw berekenen op basis van movements (laatste 30 dagen)
function recomputeAvgUsageCache() {
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
  const newCache = {};
  Object.keys(usageGrams).forEach(id => {
    newCache[id] = usageGrams[id] / 1000 / 30; // kg per dag
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

// Statusbepaling op basis van dagen en voorraad
export function getStatus(daysLeft, stockKg) {
  if (stockKg <= 0) return 'almostout';
  if (daysLeft === null || daysLeft === undefined) return 'unknown';
  if (daysLeft <= 3) return 'almostout';
  if (daysLeft <= 7) return 'low';
  return 'sufficient';
}