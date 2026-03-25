export let feedItems = [];
export let movements = [];
export let manualAvgUsage = {};

export function setFeedItems(newItems) {
  feedItems = newItems;
}

export function setMovements(newMovements) {
  movements = newMovements;
}

export function setManualAvgUsage(newManualAvgUsage) {
  manualAvgUsage = newManualAvgUsage || {};
}

export function updateManualAvg(id, value) {
  if (value > 0) {
    manualAvgUsage[id] = value;
  } else {
    delete manualAvgUsage[id];
  }
}

export function isDuplicateName(name, excludeId = null) {
  const normalized = name.trim().toLowerCase();
  return feedItems.some(
    item => item.name.toLowerCase() === normalized && (excludeId === null || item.id !== excludeId)
  );
}