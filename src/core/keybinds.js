/* KEYBINDS: which keys do what (defaults: KEYBINDS in config/controls.js), remappable from Settings → Keys and saved
   on this device. Read with is(action, code) for presses and held(action, keys) for keys held down. The hero's
   abilities pick up the skill keys (ability.keys / ability.label) so every screen that shows them stays right.
   sanitizeBinds and withRebind are pure and unit-tested. */
import { CHARACTERS } from '../config/characters.js';
import { KEYBINDS, RESERVED_KEYS, keyLabel } from '../config/controls.js';

export const KEYBINDS_STORAGE_KEY = 'lanternmoss.keys';
const DEFAULTS = Object.fromEntries(KEYBINDS.map(b => [b.id, b.keys]));
const RESERVED = new Set(RESERVED_KEYS);
const CODE = /^(Key[A-Z]|Digit\d|Numpad\w+|Arrow(Up|Down|Left|Right)|Space|Tab|CapsLock|(Shift|Control|Alt)(Left|Right)|Backquote|Minus|Equal|Bracket(Left|Right)|Backslash|Semicolon|Quote|Comma|Period|Slash|F\d{1,2})$/;

/** Can `code` be bound to an action at all? */
export const bindable = code => typeof code === 'string' && CODE.test(code) && !RESERVED.has(code);

/** A complete, valid binding table from anything (saved JSON, junk): bad codes dropped, a key used twice keeps its
    first action, an action left with no keys gets its defaults back (minus any taken elsewhere). */
export function sanitizeBinds(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}, used = new Set(), out = {};
  const take = list => list.filter(c => bindable(c) && !used.has(c) && used.add(c));
  for (const b of KEYBINDS) out[b.id] = Array.isArray(src[b.id]) ? take(src[b.id]) : null;
  for (const b of KEYBINDS) if (!out[b.id]?.length) out[b.id] = take(b.keys);
  return out;
}

/** `action` gets `code` as its main key. If another action had that key, it takes over action's old main key
    (a swap), so nothing is ever left unbound. Returns { binds, swapped: the other action's id | null }. */
export function withRebind(binds, action, code) {
  const next = Object.fromEntries(Object.entries(binds).map(([k, v]) => [k, [...v]]));
  if (!next[action] || !bindable(code)) return { binds: next, swapped: null };
  const old = next[action][0], other = Object.keys(next).find(k => k !== action && next[k].includes(code)) ?? null;
  next[action] = [code, ...next[action].filter((c, i) => i > 0 && c !== code)];
  if (other) {
    next[other] = next[other].filter(c => c !== code);
    if (old && old !== code && !next[other].includes(old)) next[other].unshift(old);
  }
  return { binds: next, swapped: other };
}

function load() {
  try { return sanitizeBinds(JSON.parse(globalThis.localStorage?.getItem(KEYBINDS_STORAGE_KEY) ?? 'null')); }
  catch { return sanitizeBinds(null); }
}
function save() { try { globalThis.localStorage?.setItem(KEYBINDS_STORAGE_KEY, JSON.stringify(binds)); } catch { /* blocked: keep for this session */ } }

/** action id -> [codes]; the live table (replaced in place on change). */
export const binds = load();
const listeners = [];
/** fn() after any change. */
export function onBindsChange(fn) { listeners.push(fn); }

/** Was `code` a press of `action`? */
export function is(action, code) { return !!binds[action]?.includes(code); }
/** Is any key of `action` held down right now? (keys = InputSystem's held-key table) */
export function held(action, keys) { return !!binds[action]?.some(c => keys[c]); }
/** 'Q', or 'I/Tab' with alternatives. */
export function bindLabel(action, all = false) { const c = binds[action] ?? []; return (all ? c : c.slice(0, 1)).map(keyLabel).join('/') || '—'; }
/** <kbd>…</kbd> chips for an action's keys. */
export function bindKbd(action, all = false) { return (all ? binds[action] : binds[action]?.slice(0, 1) ?? []).map(c => `<kbd>${keyLabel(c)}</kbd>`).join(''); }
/** Every key some action uses (for suppressing the browser's own shortcuts). */
export function boundCodes() { return new Set(Object.values(binds).flat()); }

/** The heroes' abilities take the skill keys: ability.keys / ability.label (slot n = skill n). */
function applyToAbilities() {
  for (const c of Object.values(CHARACTERS)) for (const s of Object.values(c.abilities)) {
    s.keys = [...binds[`skill${s.slot}`]]; s.label = bindLabel(`skill${s.slot}`);
  }
}
applyToAbilities();

function replace(table) { for (const k of Object.keys(binds)) delete binds[k]; Object.assign(binds, table); applyToAbilities(); save(); for (const fn of listeners) fn(); }
/** Remaps `action`; returns the id of the action it swapped keys with (or null). */
export function rebind(action, code) { const r = withRebind(binds, action, code); replace(r.binds); return r.swapped; }
export function resetBinds() { replace(sanitizeBinds(null)); }
export const DEFAULT_BINDS = DEFAULTS;
