// settings.js
const STORAGE_KEY = 'inventory_settings';

const defaultSettings = {
  lowThreshold: 7,
  almostOutThreshold: 3,
  avgDays: 30
};

export function loadSettings() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return { ...defaultSettings, ...JSON.parse(stored) };
    } catch (e) {
      return defaultSettings;
    }
  }
  return defaultSettings;
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}