/* Live player settings (schema + defaults: src/config/settings.js). Read `settings.<key>` anywhere; change them with
   setSetting(), which validates, saves to localStorage and notifies listeners (Game.applySettings pushes them into
   audio, renderer, camera and HUD). sanitizeSettings is pure and unit-tested. */
import { SETTINGS_SCHEMA, SETTINGS_STORAGE_KEY } from '../config/settings.js';

const ITEMS = SETTINGS_SCHEMA.flatMap(g => g.items);
export const SETTING_DEFS = Object.fromEntries(ITEMS.map(it => [it.key, it]));

/** Coerces one value to its definition: ranges clamped and snapped to their step, toggles boolean, choices known. */
function sanitizeValue(def, v) {
  if (def.type === 'toggle') return typeof v === 'boolean' ? v : def.default;
  if (def.type === 'choice') return def.options.some(([o]) => o === v) ? v : def.default;
  const n = Number(v); if (!Number.isFinite(n)) return def.default;
  const snapped = Math.round((Math.min(def.max, Math.max(def.min, n)) - def.min) / def.step) * def.step + def.min;
  return Math.round(snapped * 1000) / 1000;
}

/** A complete, valid settings object from anything (saved JSON, partial objects, junk); unknown keys are dropped. */
export function sanitizeSettings(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return Object.fromEntries(ITEMS.map(def => [def.key, def.key in src ? sanitizeValue(def, src[def.key]) : def.default]));
}

export const defaultSettings = () => sanitizeSettings({});

function load() {
  try { return sanitizeSettings(JSON.parse(globalThis.localStorage?.getItem(SETTINGS_STORAGE_KEY) ?? 'null')); }
  catch { return defaultSettings(); }
}
function save() {
  try { globalThis.localStorage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings)); } catch { /* storage full or blocked: keep for this session */ }
}

export const settings = load();
const listeners = [];
/** fn(key, value) after any change (key = null after a full reset). */
export function onSettingsChange(fn) { listeners.push(fn); }

export function setSetting(key, value) {
  const def = SETTING_DEFS[key]; if (!def) return;
  const v = sanitizeValue(def, value); if (settings[key] === v) return;
  settings[key] = v; save(); for (const fn of listeners) fn(key, v);
}
export function resetSettings() {
  Object.assign(settings, defaultSettings()); save(); for (const fn of listeners) fn(null, null);
}
