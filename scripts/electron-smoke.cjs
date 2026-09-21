'use strict';
// Runs the real app with a disposable library and settings directory.
const { app } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { wave } = require('../test/fixtures.cjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vinyl-electron-'));
const music = path.join(root, 'music'), userData = path.join(root, 'settings');
fs.mkdirSync(music); fs.mkdirSync(userData);
const track = path.join(music, 'test-tone.wav'), outside = path.join(root, 'outside.wav');
fs.writeFileSync(track, wave()); fs.writeFileSync(outside, wave());
fs.writeFileSync(path.join(userData, 'vinyl-settings.json'), JSON.stringify({ musicFolder: music, autostart: true }));
app.setPath('userData', userData);
app.disableHardwareAcceleration();
let loginWrites = 0, finished = false;
app.setLoginItemSettings = () => { loginWrites++; };
function finish(error) {
  if (finished) return;
  finished = true;
  if (error) console.error(error);
  else console.log('Electron smoke passed: sandboxed UI, IPC, audio metadata/play/seek, byte ranges and file access.');
  app.exit(error ? 1 : 0);
}
const deadline = setTimeout(() => finish(new Error('Electron smoke timed out')), 45000);
app.on('web-contents-created', (_event, contents) => {
  contents.on('console-message', details => console.log('Renderer:', details.message));
  contents.on('preload-error', (_event, _file, error) => finish(error));
  contents.on('render-process-gone', (_event, details) => { if (!finished) finish(new Error(JSON.stringify(details))); });
});
app.once('browser-window-created', (_event, win) => {
  win.webContents.once('did-finish-load', async () => {
    try {
      assert.equal(win.webContents.getURL(), 'app://vinyl/index.html');
      assert.equal(win.webContents.getLastWebPreferences().sandbox, true);
      const result = await win.webContents.executeJavaScript(`(async () => {
        const api = window.vinyl;
        const state = await api.getState();
        const invalid = await api.setSetting('volume', 9);
        const after = await api.getState();
        const library = await api.listTracks();
        const file = library.tracks[0].path;
        console.log('Smoke: settings and library loaded; checking media requests');
        const response = await fetch(api.mediaUrl(file), {headers:{Range:'bytes=-4'}});
        const ranged = {status:response.status, size:(await response.arrayBuffer()).byteLength};
        const blocked = await fetch(api.mediaUrl(${JSON.stringify(outside)}));
        let metadataBlocked = false;
        try { await api.trackMeta(${JSON.stringify(outside)}); } catch { metadataBlocked = true; }
        const metadata = await api.trackMeta(file);
        console.log('Smoke: ranges, denied paths and metadata passed; checking playback');
        const audio = document.getElementById('audio');
        audio.muted = true;
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Audio metadata timed out')), 10000);
          audio.addEventListener('loadedmetadata', () => {clearTimeout(timeout);resolve();}, {once:true});
          audio.addEventListener('error', () => {clearTimeout(timeout);reject(new Error('Audio load failed'));}, {once:true});
          audio.src = api.mediaUrl(file); audio.load();
        });
        buildEq();
        await audio.play(); audio.pause();
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Seek timed out')), 10000);
          audio.addEventListener('seeked', () => {clearTimeout(timeout);resolve();}, {once:true});
          audio.currentTime = 1;
        });
        return {invalid, volume:after.volume, originalVolume:state.volume, tracks:library.tracks.length,
          ranged, blocked:blocked.status, metadataBlocked, metadataTitle:metadata.title,
          duration:audio.duration, position:audio.currentTime, nodeExposed:typeof window.require};
      })()`, true);
      assert.equal(result.invalid, false); assert.equal(result.volume, result.originalVolume);
      assert.equal(result.tracks, 1); assert.deepEqual(result.ranged, { status: 206, size: 4 });
      assert.equal(result.blocked, 404); assert.equal(result.metadataBlocked, true);
      assert.ok(result.metadataTitle); assert.ok(Math.abs(result.duration - 2) < 0.1);
      assert.ok(Math.abs(result.position - 1) < 0.1); assert.equal(result.nodeExposed, 'undefined');
      assert.equal(loginWrites, 0, 'Development startup must not register Windows autostart');
      clearTimeout(deadline); finish();
    } catch (error) { finish(error); }
  });
});
process.on('uncaughtException', finish);
process.on('unhandledRejection', finish);
require('../main.js');
