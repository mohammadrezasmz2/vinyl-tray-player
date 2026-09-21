'use strict';

const DEFAULTS = {
  musicFolder: '', favorites: [], volume: 0.85, shuffle: false, repeat: 'off',
  theme: 0, lastTrack: '', source: 'folder', autostart: true, ambient: [],
  ambientVol: 0.5, precip: 0.5, background: '', eqPreset: 'flat',
  eqCustom1: [0, 0, 0, 0, 0, 0], eqCustom2: [0, 0, 0, 0, 0, 0], pinned: false
};
const AMBIENCE = ['rain', 'drizzle', 'downpour', 'rooftop', 'thunder', 'fire', 'wind'];
const EDITABLE = new Set(['favorites', 'volume', 'shuffle', 'repeat', 'theme',
  'lastTrack', 'source', 'ambient', 'ambientVol', 'precip', 'eqPreset', 'eqCustom1', 'eqCustom2']);
const bounded = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const fileString = v => typeof v === 'string' && v.length <= 32768 && !v.includes('\0');

function validSetting(key, value) {
  switch (key) {
    case 'musicFolder': case 'lastTrack': case 'background': return fileString(value);
    case 'favorites': return Array.isArray(value) && value.every(v => fileString(v) && v.length > 0);
    case 'shuffle': case 'autostart': case 'pinned': return typeof value === 'boolean';
    case 'volume': case 'ambientVol': case 'precip': return bounded(value, 0, 1);
    case 'theme': return Number.isInteger(value) && bounded(value, 0, 10);
    case 'repeat': return ['off', 'all', 'one'].includes(value);
    case 'source': return ['folder', 'favorites'].includes(value);
    case 'ambient': return Array.isArray(value) && value.every(v => AMBIENCE.includes(v));
    case 'eqPreset': return ['flat', 'pop', 'classic', 'rock', 'jazz', 'custom1', 'custom2'].includes(value);
    case 'eqCustom1': case 'eqCustom2':
      return Array.isArray(value) && value.length === 6 && value.every(v => bounded(v, -12, 12));
    default: return false;
  }
}

function normalizeSettings(raw = {}) {
  const result = structuredClone(DEFAULTS);
  for (const key of Object.keys(DEFAULTS)) {
    if (validSetting(key, raw[key])) result[key] = structuredClone(raw[key]);
  }
  result.favorites = [...new Set(result.favorites)];
  result.ambient = [...new Set(result.ambient)];
  return result;
}

module.exports = { DEFAULTS, EDITABLE, validSetting, normalizeSettings };
