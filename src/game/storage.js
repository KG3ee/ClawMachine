const SETTINGS_KEY = 'pixel-claw-settings-v1';
const COLLECTION_KEY = 'pixel-claw-collection-v1';

export const DEFAULT_SETTINGS = Object.freeze({
  pixelation: true,
  shadows: false,
  captions: true,
  speech: true,
  speechRate: 'slow',
  zoom: 1,
  music: true,
  musicVolume: 0.35,
  sfx: true,
  sfxVolume: 0.65,
  learnMode: false
});

const DEFAULT_COLLECTION = Object.freeze({
  bunny: 0,
  bear: 0,
  star: 0,
  ball: 0,
  car: 0,
  cat: 0,
  dog: 0
});

function readJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return fallback;
    }

    return parsed;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures.
  }
}

export function loadSettings() {
  const stored = readJSON(SETTINGS_KEY, {});
  return {
    ...DEFAULT_SETTINGS,
    ...stored
  };
}

export function saveSettings(settings) {
  writeJSON(SETTINGS_KEY, settings);
}

export function loadCollection() {
  const stored = readJSON(COLLECTION_KEY, {});
  return {
    ...DEFAULT_COLLECTION,
    ...stored
  };
}

export function saveCollection(collection) {
  writeJSON(COLLECTION_KEY, collection);
}

export function addToCollection(collection, toyType) {
  const next = {
    ...collection,
    [toyType]: (collection[toyType] || 0) + 1
  };
  saveCollection(next);
  return next;
}
