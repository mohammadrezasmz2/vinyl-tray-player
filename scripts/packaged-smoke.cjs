'use strict';
// CI-only: exercises the actual ZIP and NSIS installation in a disposable VM.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { wave } = require('../test/fixtures.cjs');
const { version } = require('../package.json');
const { listPackage } = require('@electron/asar');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const dist = path.resolve(__dirname, '../dist');
const evidence = path.join(dist, 'validation');

function command(file, args, options = {}) {
  const result = spawnSync(file, args, { encoding: 'utf8', timeout: 120000, windowsHide: true, ...options });
  assert.equal(result.status, 0, `${file}: ${result.error || result.stderr || result.stdout}`);
}
async function freePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
function checkFiles(directory) {
  for (const file of ['Vinyl.exe', 'resources/app.asar', 'LICENSE.electron.txt', 'LICENSES.chromium.html',
    'LICENSE.vinyl.txt', 'THIRD_PARTY_NOTICES.txt', 'README.fa.md']) {
    assert.ok(fs.statSync(path.join(directory, file)).size > 0, `Missing distribution file: ${file}`);
  }
  const entries = listPackage(path.join(directory, 'resources/app.asar')).map(file => file.replaceAll('\\', '/'));
  for (const name of ['electron', 'electron-builder', 'app-builder-lib']) {
    assert.ok(!entries.some(file => file.startsWith(`/node_modules/${name}/`)), `Development dependency included: ${name}`);
  }
}
async function exercise(directory, profile, track, label) {
  checkFiles(directory);
  fs.mkdirSync(profile, { recursive: true });
  fs.writeFileSync(path.join(profile, 'vinyl-settings.json'), JSON.stringify({ musicFolder: path.dirname(track), autostart: false }));
  const port = await freePort();
  const child = spawn(path.join(directory, 'Vinyl.exe'), [
    `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`,
    '--remote-debugging-address=127.0.0.1', '--disable-gpu', track
  ], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let diagnostics = '', startupError, ws;
  child.stdout.on('data', data => { diagnostics += data; });
  child.stderr.on('data', data => { diagnostics += data; });
  child.on('error', error => { startupError = error; });
  try {
    let target;
    const deadline = Date.now() + 30000;
    while (!target && Date.now() < deadline) {
      if (startupError) throw startupError;
      if (child.exitCode !== null) throw new Error(`Packaged app exited: ${diagnostics}`);
      try {
        const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        target = targets.find(item => item.type === 'page' && item.url === 'app://vinyl/index.html');
      } catch { /* Wait for the local debugger socket. */ }
      if (!target) await pause(150);
    }
    assert.ok(target, `Packaged UI did not start: ${diagnostics}`);
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0;
    const pending = new Map();
    ws.onmessage = event => {
      const message = JSON.parse(event.data), entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id); clearTimeout(entry.timer);
      message.error ? entry.reject(new Error(JSON.stringify(message.error))) : entry.resolve(message.result);
    };
    const call = (method, params = {}) => new Promise((resolve, reject) => {
      const requestId = ++id;
      const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`${method} timed out`)); }, 30000);
      pending.set(requestId, { resolve, reject, timer });
      ws.send(JSON.stringify({ id: requestId, method, params }));
    });
    const response = await call('Runtime.evaluate', { awaitPromise: true, returnByValue: true, userGesture: true,
      expression: `(async () => {
        const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        for(let i=0;i<100 && (!window.vinyl || document.readyState !== 'complete');i++) await wait(50);
        const api = window.vinyl, state = await api.getState(), library = await api.listTracks();
        const file = library.tracks[0].path, audio = document.getElementById('audio');
        const ranged = await fetch(api.mediaUrl(file), {headers:{Range:'bytes=-4'}});
        const tail = {status:ranged.status, bytes:(await ranged.arrayBuffer()).byteLength};
        audio.muted = true;
        await new Promise((resolve,reject) => {
          const timer=setTimeout(()=>reject(new Error('Metadata timeout')),10000);
          audio.addEventListener('loadedmetadata',()=>{clearTimeout(timer);resolve();},{once:true});
          audio.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('Audio error'));},{once:true});
          audio.src=api.mediaUrl(file);audio.load();
        });
        buildEq();await audio.play();audio.pause();
        await new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>reject(new Error('Seek timeout')),10000);
          audio.addEventListener('seeked',()=>{clearTimeout(timer);resolve();},{once:true});audio.currentTime=1;
        });
        return {version:state.version,tracks:library.tracks.length,autostart:state.autostart,
          tail,duration:audio.duration,position:audio.currentTime,nodeExposed:typeof window.require};
      })()` });
    assert.ok(!response.exceptionDetails, JSON.stringify(response.exceptionDetails));
    const result = response.result.value;
    assert.equal(result.version, version); assert.equal(result.tracks, 1);
    assert.deepEqual(result.tail, { status: 206, bytes: 4 });
    assert.ok(Math.abs(result.duration - 2) < 0.1); assert.ok(Math.abs(result.position - 1) < 0.1);
    assert.equal(result.nodeExposed, 'undefined');
    const screenshot = await call('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(evidence, `${label}-window.png`), Buffer.from(screenshot.data, 'base64'));
    console.log(`Packaged ${label}: startup, ASAR resources, version, audio playback and seek passed.`);
    return result;
  } finally {
    if (ws) ws.close();
    if (child.pid) spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    await pause(500);
  }
}
async function main() {
  assert.equal(process.platform, 'win32', 'Use the Windows CI runner');
  assert.equal(process.env.CI, 'true', 'Installer checks require a disposable CI runner');
  fs.mkdirSync(evidence, { recursive: true });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vinyl-package-'));
  const music = path.join(root, 'music'), portable = path.join(root, 'portable'), installed = path.join(root, 'installed');
  fs.mkdirSync(music); const track = path.join(music, 'release-tone.wav'); fs.writeFileSync(track, wave());
  let installCreated = false;
  try {
    command('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      'Expand-Archive -LiteralPath $env:VINYL_TEST_ZIP -DestinationPath $env:VINYL_TEST_DEST'], {
      env: { ...process.env, VINYL_TEST_ZIP: path.join(dist, `Vinyl-${version}-Windows-x64.zip`), VINYL_TEST_DEST: portable }
    });
    const portableResult = await exercise(portable, path.join(root, 'portable-profile'), track, 'portable');
    command(path.join(dist, `Vinyl-${version}-Setup-x64.exe`), ['/S', `/D=${installed}`]);
    installCreated = true;
    const installedResult = await exercise(installed, path.join(root, 'installed-profile'), track, 'installed');
    command(path.join(installed, 'Uninstall Vinyl.exe'), ['/S']);
    const deadline = Date.now() + 30000;
    while (fs.existsSync(path.join(installed, 'Vinyl.exe')) && Date.now() < deadline) await pause(250);
    assert.ok(!fs.existsSync(path.join(installed, 'Vinyl.exe')), 'Uninstaller left the application executable');
    installCreated = false;
    const report = { version, status: 'passed', platform: process.platform, architecture: process.arch,
      portable: portableResult, installed: installedResult, silentInstall: 'passed', silentUninstall: 'passed',
      manualListening: 'not performed', interactiveInstaller: 'not performed', packagedAutostart: 'not performed' };
    fs.writeFileSync(path.join(evidence, 'package-checks.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('Windows ZIP, silent installation and uninstallation checks passed.');
  } finally {
    if (installCreated && fs.existsSync(path.join(installed, 'Uninstall Vinyl.exe'))) {
      spawnSync(path.join(installed, 'Uninstall Vinyl.exe'), ['/S'], { timeout: 30000, windowsHide: true });
    }
    fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
