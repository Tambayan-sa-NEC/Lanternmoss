import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PlanetMechanics } from '../src/gameplay/PlanetMechanics.js';
import { cleanMechanicSnapshot, cleanMechanicState, registerMechanic } from '../src/world/mechanics/index.js';
import { PLANETS } from '../src/config/planets.js';
import { cleanState, sanitizeSave } from '../src/core/save.js';

function setup(id = 'unitProbe', extra = {}) {
  const events = new EventTarget(), calls = [], world = {}, instances = [], listeners = new Set();
  const add = events.addEventListener.bind(events), remove = events.removeEventListener.bind(events);
  events.addEventListener = (type, fn) => { if (type === 'timeskip') listeners.add(fn); add(type, fn); };
  events.removeEventListener = (type, fn) => { if (type === 'timeskip') listeners.delete(fn); remove(type, fn); };
  let now = 10, running = true;
  const clean = v => ({ n: typeof v?.n === 'number' && Number.isFinite(v.n) ? Math.max(0, Math.min(10000, v.n)) : 0,
    marks: (Array.isArray(v?.marks) ? v.marks : []).filter(Number.isFinite).slice(0, 3) });
  const unregister = registerMechanic(id, { clean, create(env) {
    let state;
    const instance = { env, load(s) { state = s; calls.push('load'); }, toJSON() { return state; },
      enter() { calls.push(['enter', state.n]); }, update(dt) { state.n += dt; calls.push(['update', dt]); },
      advance(dt, meta) { state.n += dt; calls.push(['advance', dt, meta.reason]); }, exit() { calls.push('exit'); }, ...extra };
    instances.push(instance); return instance;
  } });
  const manager = new PlanetMechanics(world, { clock: () => now, running: () => running, events });
  return { id, manager, calls, instances, events, listeners, unregister, setClock: n => { now = n; }, setRunning: v => { running = v; } };
}
const planet = (id, mechanic) => ({ id, mechanic });
const skip = (events, seconds, reason = 'sleep') => events.dispatchEvent(Object.assign(new Event('timeskip'), { detail: { seconds, reason } }));

test('saved state and away time load before enter; a new instance starts for every world', () => {
  const t = setup();
  try {
    t.manager.snapshotForPlanet = id => id === 'lanternmoss' ? { id: t.id, state: { n: 7, marks: [] }, at: 8 } : null;
    t.manager.enter(planet('lanternmoss', t.id));
    assert.deepEqual(t.calls, ['load', ['advance', 2, 'away'], ['enter', 9]]);
    t.manager.enter(planet('emberfall', t.id));
    assert.deepEqual(t.calls.slice(-3), ['exit', 'load', ['enter', 0]]);
    assert.notEqual(t.instances[0], t.instances[1]); assert.equal(t.instances[1].env.planet.id, 'emberfall');
  } finally { t.manager.exit(); t.unregister(); }
});

test('title/pause gate freezes updates; frames and explicit skips advance once without frame replay', () => {
  const t = setup();
  try {
    t.manager.enter(planet('lanternmoss', t.id)); t.setRunning(false); t.manager.update(1);
    assert.equal(t.manager.toJSON().state.n, 0);
    t.setRunning(true); t.setClock(11); t.manager.update(1);
    t.setClock(31); skip(t.events, 20, 'nap');
    t.setClock(32); t.manager.update(1);
    assert.equal(t.manager.toJSON().state.n, 22);
    assert.deepEqual(t.calls.filter(c => c[0] === 'advance'), [['advance', 20, 'nap']]);
    assert.equal(t.calls.filter(c => c[0] === 'update').length, 2);
    for (const dt of [0, -1, NaN, Infinity]) t.manager.update(dt);
    assert.equal(t.manager.toJSON().state.n, 22);
  } finally { t.manager.exit(); t.unregister(); }
});

test('unnotified forward clock changes use a bounded advance hook; backwards clocks never advance negatively', () => {
  const t = setup();
  try {
    t.manager.enter(planet('lanternmoss', t.id)); t.setClock(110); t.manager.update(1);
    assert.equal(t.manager.toJSON().state.n, 100);
    assert.deepEqual(t.calls.filter(c => c[0] === 'advance'), [['advance', 99, 'clock']]);
    t.setClock(0); t.manager.update(1); assert.equal(t.manager.toJSON().state.n, 101);
  } finally { t.manager.exit(); t.unregister(); }
});

test('snapshots are schema-cleaned copies, type mismatches default, and old saves need no mechanic fields', () => {
  const t = setup();
  try {
    const raw = { id: t.id, state: { n: 99, marks: [1, 2], injected: true }, at: 10 };
    const clean = cleanMechanicSnapshot(raw); clean.state.marks.push(3); assert.deepEqual(raw.state.marks, [1, 2]);
    assert.equal(cleanMechanicSnapshot(raw, 'other'), null); assert.equal(cleanMechanicSnapshot({ id: 'unknown', state: {} }), null);
    t.manager.snapshotForPlanet = () => ({ ...raw, id: 'other' }); t.manager.enter(planet('lanternmoss', t.id));
    assert.equal(t.manager.toJSON().state.n, 0);
    t.manager.load(raw); const saved = t.manager.toJSON(); saved.state.n = 1;
    assert.equal(t.manager.toJSON().state.n, 99);
    const old = JSON.parse(readFileSync(new URL('fixtures/save-v1.json', import.meta.url), 'utf8'));
    assert.deepEqual(sanitizeSave(old).planets, old.planets);
    assert.equal(cleanState('mechanics', null), null);
    old.planets.emberfall.mechanics = raw;
    assert.equal(sanitizeSave(old).planets.emberfall.mechanics, null, 'another world cannot inject a mechanic it does not declare');
  } finally { t.manager.exit(); t.unregister(); }
});

test('matching declared mechanic state survives v1 cleaning; bad timestamps do not cause catch-up', () => {
  const t = setup(), previous = PLANETS[1].mechanic;
  try {
    PLANETS[1].mechanic = t.id;
    const old = JSON.parse(readFileSync(new URL('fixtures/save-v1.json', import.meta.url), 'utf8'));
    old.planets.emberfall.mechanics = { id: t.id, state: { n: Infinity, marks: [] }, at: -1 };
    assert.deepEqual(sanitizeSave(old).planets.emberfall.mechanics, { id: t.id, state: { n: 0, marks: [] }, at: null });
    t.manager.snapshotForPlanet = () => sanitizeSave(old).planets.emberfall.mechanics;
    t.manager.enter(planet('emberfall', t.id)); assert.deepEqual(t.calls, ['load', ['enter', 0]]);
  } finally { PLANETS[1].mechanic = previous; t.manager.exit(); t.unregister(); }
});

test('exit is idempotent and detaches time-skip listeners; unknown modules preserve the current instance', () => {
  const t = setup();
  try {
    t.manager.enter(planet('lanternmoss', t.id)); const active = t.manager.active;
    assert.equal(t.listeners.size, 1);
    assert.throws(() => t.manager.enter(planet('emberfall', 'unknown')), /Unknown/); assert.equal(t.manager.active, active);
    t.manager.exit(); t.manager.exit(); skip(t.events, 10);
    assert.equal(t.listeners.size, 0);
    assert.equal(t.manager.id, null); assert.equal(t.manager.toJSON(), null);
    assert.equal(t.calls.filter(c => c === 'exit').length, 1);
    assert.equal(t.calls.some(c => c[0] === 'advance'), false);
  } finally { t.manager.exit(); t.unregister(); }
});

test('failed entry and incomplete modules clean up; invalid registration/state schemas fail early', () => {
  const t = setup('failureProbe', { enter() { throw new Error('enter failed'); } });
  try {
    assert.throws(() => t.manager.enter(planet('lanternmoss', t.id)), /enter failed/);
    assert.equal(t.manager.id, null); assert.equal(t.calls.at(-1), 'exit');
    assert.throws(() => registerMechanic(t.id, { create() {}, clean() {} }), /duplicate/);
    assert.throws(() => registerMechanic('bad id', {}), /Invalid/);
    assert.throws(() => cleanMechanicState({ clean: () => new Date() }), /plain/);
    let exits = 0;
    const remove = registerMechanic('incompleteProbe', { clean: () => ({}), create: () => ({ exit() { exits++; } }) });
    try { assert.throws(() => t.manager.enter(planet('lanternmoss', 'incompleteProbe')), /Incomplete/); assert.equal(exits, 1); } finally { remove(); }
  } finally { t.manager.exit(); t.unregister(); }
});
