'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { installWindowLifecycle } = require('../lib/window-lifecycle.cjs');

function fixture() {
  const app = new EventEmitter();
  const win = new EventEmitter();
  let hides = 0;
  let quits = 0;
  win.hide = () => { hides++; };
  app.quit = () => { quits++; app.emit('before-quit'); };
  const lifecycle = installWindowLifecycle(win, app);
  const close = () => {
    const event = { prevented: false, preventDefault() { this.prevented = true; } };
    win.emit('close', event);
    return event.prevented;
  };
  return { app, win, close, lifecycle, get hides() { return hides; }, get quits() { return quits; } };
}

test('ordinary window close continues to hide Vinyl in the tray', () => {
  const f = fixture();
  assert.equal(f.close(), true);
  assert.equal(f.hides, 1);
  assert.equal(f.quits, 0);
});

test('explicit Quit allows the window to close instead of hiding', () => {
  const f = fixture();
  f.lifecycle.requestQuit();
  assert.equal(f.quits, 1);
  assert.equal(f.close(), false);
  assert.equal(f.hides, 0);
});

test('Windows shutdown query disables hide-on-close before app quit events', () => {
  const f = fixture();
  f.win.emit('query-session-end');
  assert.equal(f.close(), false);
  assert.equal(f.hides, 0);
  assert.equal(f.quits, 0);
  f.win.emit('session-end');
  assert.equal(f.quits, 1);
  f.win.emit('session-end');
  assert.equal(f.quits, 1, 'session-end should only request quit once');
});

test('session-end without a preceding query still permits a clean quit', () => {
  const f = fixture();
  f.win.emit('session-end');
  assert.equal(f.quits, 1);
  assert.equal(f.close(), false);
  assert.equal(f.hides, 0);
});

test('external app.quit before-quit event bypasses hide-on-close', () => {
  const f = fixture();
  f.app.emit('before-quit');
  assert.equal(f.close(), false);
  assert.equal(f.hides, 0);
});
