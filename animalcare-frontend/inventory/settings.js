const defaultSettings = {
  lowThreshold: 7,
  almostOutThreshold: 3,
  avgDays: 30
};

let currentSettings = { ...defaultSettings };

export function getSettings() {
  return currentSettings;
}

export function setSettings(settings) {
  currentSettings = {
    ...defaultSettings,
    ...settings
  };
}

export function getDefaultSettings() {
  return { ...defaultSettings };
}