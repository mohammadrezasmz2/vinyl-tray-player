'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

async function renderer(state = {}) {
  const elements = new Map(), writes = [];
  function element(id) {
    if (elements.has(id)) return elements.get(id);
    const classes = new Set(), listeners = {};
    const el = { textContent: '', value: '', paused: true, playCount: 0, currentTime: 0,
      style: { setProperty() {}, removeProperty() {} },
      classList: { add: (...names) => names.forEach(n => classes.add(n)), remove: (...names) => names.forEach(n => classes.delete(n)),
        contains: n => classes.has(n), toggle(n, force) { const yes = force ?? !classes.has(n); yes ? classes.add(n) : classes.delete(n); return yes; } },
      addEventListener(n, cb) { (listeners[n] ||= []).push(cb); },
      removeAttribute(n) { delete this[n]; }, querySelectorAll: () => [],
      play() { this.paused = false; this.playCount++; for (const cb of listeners.play || []) cb(); return Promise.resolve(); },
      pause() { this.paused = true; for (const cb of listeners.pause || []) cb(); }
    };
    elements.set(id, el); return el;
  }
  const api = {
    getState: async () => ({ version: '1.6.4', favorites: [], ...state }),
    listTracks: async () => ({ folder: '/music', tracks: [{ path: '/music/a.wav', name: 'A' }] }),
    getPendingFile: async () => null, setSetting: async (key, value) => { writes.push([key, value]); return true; },
    trackMeta: async file => ({ title: file, artist: '' }), mediaUrl: p => p,
    onFolderChanged() {}, onPlayFile() {}
  };
  function AudioContext() {
    const node = () => ({ connect() {}, gain: { value: 0, setTargetAtTime() {} }, frequency: {}, Q: {} });
    return { state: 'running', currentTime: 0, destination: {}, createMediaElementSource: node, createBiquadFilter: node };
  }
  const document = { getElementById: element, documentElement: element('root'), querySelectorAll: () => [], addEventListener() {} };
  const context = vm.createContext({ window: { vinyl: api, AudioContext, addEventListener() {} }, document,
    requestAnimationFrame: () => 1, cancelAnimationFrame() {}, setTimeout: () => 1, clearTimeout() {}, console });
  let source = fs.readFileSync(path.join(__dirname, '../renderer/renderer.js'), 'utf8');
  source = source.replace('init().catch(error=>{', 'globalThis.ready = init().catch(error=>{');
  vm.runInContext(source + '\nglobalThis.controls = {loadTrack,pause,reloadFolder,markSheetPlaying,state:()=>({source,queue,currentPath})};', context);
  await context.ready;
  await new Promise(resolve => setImmediate(resolve));
  return { api, elements, writes, controls: context.controls, audio: element('audio') };
}

test('playback starts before slow metadata and stale metadata cannot resume a paused new track', async () => {
  const r = await renderer();
  let finishOld;
  r.api.trackMeta = file => file === '/music/old.wav' ? new Promise(resolve => { finishOld = resolve; }) : Promise.resolve({ title: 'New title' });
  const before = r.audio.playCount;
  const pending = r.controls.loadTrack('/music/old.wav', true);
  assert.equal(r.audio.playCount, before + 1, 'metadata must not delay play');
  r.controls.pause();
  await r.controls.loadTrack('/music/new.wav', false);
  finishOld({ title: 'Stale title', artist: 'Wrong artist' });
  await pending;
  assert.equal(r.audio.paused, true);
  assert.equal(r.elements.get('title').textContent, 'New title');
});

test('changing the music folder while Favorites is selected resets the source and queue', async () => {
  const r = await renderer({ source: 'favorites', favorites: ['/favorites/f.wav'] });
  r.api.listTracks = async () => ({ folder: '/new', tracks: [{ path: '/new/b.wav', name: 'B' }] });
  await r.controls.reloadFolder();
  const state = r.controls.state();
  assert.equal(state.source, 'folder');
  assert.deepEqual(Array.from(state.queue), ['/new/b.wav']);
  assert.equal(r.elements.get('source').value, 'folder');
  assert.ok(r.writes.some(([k, v]) => k === 'source' && v === 'folder'));
});

test('only the current track retains the playing marker', async () => {
  const r = await renderer();
  const rows = ['/music/a.wav', '/music/b.wav'].map(p => ({ dataset: { path: p }, classList: { toggle() {} },
    index: { textContent: '♪' }, querySelector() { return this.index; } }));
  r.elements.get('sheetList').querySelectorAll = () => rows;
  await r.controls.loadTrack('/music/b.wav', false);
  assert.deepEqual(rows.map(row => row.index.textContent), ['1', '♪']);
});
