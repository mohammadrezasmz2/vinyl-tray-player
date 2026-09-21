'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validSetting, normalizeSettings, DEFAULTS, EDITABLE } = require('../lib/settings.cjs');
const { trustedSender } = require('../lib/ipc.cjs');

test('invalid persisted settings recover without dropping valid preferences', () => {
  const recovered = normalizeSettings({ volume: 10, theme: -1, eqCustom1: [99], favorites: ['a.wav', 'a.wav'],
    repeat: 'all', shuffle: true, ambient: ['rain', 'rain'], musicFolder: '/music' });
  assert.equal(recovered.volume, 0.85); assert.equal(recovered.theme, 0);
  assert.deepEqual(recovered.eqCustom1, DEFAULTS.eqCustom1);
  assert.deepEqual(recovered.favorites, ['a.wav']); assert.deepEqual(recovered.ambient, ['rain']);
  assert.equal(recovered.repeat, 'all'); assert.equal(recovered.shuffle, true);
  assert.equal(recovered.musicFolder, '/music');
  recovered.eqCustom1[0] = 10; assert.equal(DEFAULTS.eqCustom1[0], 0);
});

test('setting values obey ranges and types and cannot create arbitrary keys', () => {
  for (const [key, value] of [['volume', NaN], ['volume', -0.1], ['volume', '1'], ['volume', Infinity],
    ['theme', 1.5], ['repeat', 'repeat'], ['favorites', 'all'], ['eqCustom1', [0,0,0,0,0,13]],
    ['ambient', ['unknown']], ['shuffle', 1], ['__proto__', {}], ['lastTrack', 'a\0b']]) {
    assert.equal(validSetting(key, value), false, key);
  }
  assert.equal(validSetting('volume', 0), true); assert.equal(validSetting('volume', 1), true);
  assert.equal(validSetting('eqCustom1', [-12, 12, 0, 0, 0, 0]), true);
  assert.equal(EDITABLE.has('musicFolder'), false); assert.equal(EDITABLE.has('background'), false);
});

test('IPC only accepts the application main frame', () => {
  const frame = { url: 'app://vinyl/index.html' }, wc = { mainFrame: frame };
  const window = { isDestroyed: () => false, webContents: wc };
  const check = event => trustedSender(event, window, frame.url);
  assert.equal(check({ sender: wc, senderFrame: frame }), true);
  assert.equal(check({ sender: {}, senderFrame: frame }), false);
  assert.equal(check({ sender: wc, senderFrame: { url: frame.url } }), false);
  assert.equal(check({ sender: wc, senderFrame: null }), false);
  assert.equal(trustedSender({ sender: wc, senderFrame: frame }, window, 'https://example.com'), false);
});
