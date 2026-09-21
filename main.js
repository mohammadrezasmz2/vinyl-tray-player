'use strict';

const {
  app, BrowserWindow, Tray, Menu, ipcMain, dialog,
  protocol, nativeImage, shell, screen, net
} = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const Store = require('electron-store');
let metadataModule;
const { pathToFileURL } = require('node:url');
const { DEFAULTS, EDITABLE, validSetting, normalizeSettings } = require('./lib/settings.cjs');
const { AUDIO_MIME, IMAGE_MIME, MediaAccess, createMediaHandler } = require('./lib/media.cjs');
const { trustedSender } = require('./lib/ipc.cjs');
const ENTRY_URL = 'app://vinyl/index.html';
const mediaAccess = new MediaAccess();

const AUDIO_EXTS = new Set(Object.keys(AUDIO_MIME));
// Keep Electron's profile and application settings together when an explicit
// profile directory is supplied, including isolated packaged-app checks.
const userDataOverride = app.commandLine.getSwitchValue('user-data-dir');
if (userDataOverride && path.isAbsolute(userDataOverride)) {
  fs.mkdirSync(userDataOverride, { recursive: true });
  app.setPath('userData', userDataOverride);
}
const store = new Store({ name: 'vinyl-settings', defaults: structuredClone(DEFAULTS) });
store.set(normalizeSettings(store.store));

let tray = null;
let win = null;
let isQuitting = false;
let dialogOpen = false;
let pendingFile = null;
let pinned = false;

function fileFromArgv(argv) {
  if (!argv) return null;
  for (let i = argv.length - 1; i >= 0; i--) {
    const a = argv[i];
    if (!a || a.startsWith('--') || a.startsWith('-')) continue;
    if (AUDIO_EXTS.has(path.extname(a).toLowerCase()) && fs.existsSync(a)) return a;
  }
  return null;
}

async function handleOpenFile(fp) {
  if (!fp || !(await mediaAccess.allowAudio([fp])).length) return;
  const dir = path.dirname(fp);
  store.set('musicFolder', dir);
  store.set('source', 'folder');
  if (win && win.webContents) {
    if (win.webContents.isLoading()) {
      pendingFile = fp;
    } else {
      win.webContents.send('play-file', { file: fp, folder: dir });
    }
    positionWindowNearTray(); win.show(); win.focus();
  } else {
    pendingFile = fp;
  }
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
  { scheme: 'media', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } }
]);

function resolveMusicFolder() {
  const custom = store.get('musicFolder');
  if (custom && fs.existsSync(custom)) return custom;
  return app.getPath('music');
}

function createWindow() {
  win = new BrowserWindow({
    width: 360,
    height: 476,
    show: false,
    frame: false,
    resizable: false,
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    skipTaskbar: true,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => { if (url !== ENTRY_URL) event.preventDefault(); });
  win.webContents.on('will-attach-webview', event => event.preventDefault());
  win.loadURL(ENTRY_URL);

  win.on('blur', () => {
    if (!pinned && !dialogOpen && win && win.isVisible()) win.hide();
  });
  win.on('close', (e) => {
    if (!isQuitting) { e.preventDefault(); win.hide(); }
  });
}

function positionWindowNearTray() {
  if (!win) return;
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const area = display.workArea;
  const b = win.getBounds();
  const margin = 8;
  let x = area.x + area.width - b.width - margin;
  let y = area.y + area.height - b.height - margin;
  try {
    const tb = tray.getBounds();
    if (tb && tb.width) {
      x = Math.round(tb.x + tb.width / 2 - b.width / 2);
      x = Math.min(x, area.x + area.width - b.width - margin);
      x = Math.max(x, area.x + margin);
    }
  } catch (_) {}
  win.setBounds({ x, y, width: b.width, height: b.height });
}

function toggleWindow() {
  if (!win) return;
  if (win.isVisible()) win.hide();
  else { positionWindowNearTray(); win.show(); win.focus(); }
}

function applyAutostart() {
  if (process.platform !== 'win32' || !app.isPackaged) return;
  try {
    app.setLoginItemSettings({
      openAtLogin: !!store.get('autostart'),
      path: process.execPath,
      args: ['--autostart']
    });
  } catch (_) {}
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray.png');
  let img = nativeImage.createFromPath(iconPath);
  if (img.isEmpty()) {
    img = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAADdJREFUOI1jZGBg+M9AAWAcNWDUgFEDGBgYGP7TwUBGRkYGRkbGUQNGDRg1YNSAUQNGDRg1AABBHwUB1o2u8QAAAABJRU5ErkJggg=='
    );
  }
  tray = new Tray(img);
  tray.setToolTip('Vinyl');
  rebuildTrayMenu();
  tray.on('click', () => toggleWindow());
  tray.on('right-click', () => tray.popUpContextMenu());
}

function rebuildTrayMenu() {
  const menu = Menu.buildFromTemplate([
    { label: 'Open Vinyl', click: () => toggleWindow() },
    { type: 'separator' },
    { label: 'Change music folder…', click: async () => { await pickFolder(); } },
    {
      label: 'Start with Windows',
      type: 'checkbox',
      enabled: process.platform === 'win32' && app.isPackaged,
      checked: !!store.get('autostart'),
      click: (item) => { store.set('autostart', item.checked); applyAutostart(); }
    },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); } }
  ]);
  tray.setContextMenu(menu);
}

async function scanFolder(dir, depth = 0, out = []) {
  if (depth > 6) return out;
  let entries;
  try { entries = await fsp.readdir(dir, { withFileTypes: true }); }
  catch (_) { return out; }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name.startsWith('.')) continue;
      await scanFolder(full, depth + 1, out);
    } else if (ent.isFile() && AUDIO_EXTS.has(path.extname(ent.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}
function cleanName(file) {
  return path.basename(file, path.extname(file)).replace(/[_]+/g, ' ').trim();
}
async function buildTrackList(dir) {
  const files = await mediaAccess.allowAudio(await scanFolder(dir));
  files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return files.map((f) => ({ path: f, name: cleanName(f) }));
}

async function readMeta(file) {
  const result = { title: cleanName(file), artist: '', album: '', cover: null };
  try {
    metadataModule ||= import('music-metadata');
    const { parseFile } = await metadataModule;
    const meta = await parseFile(file, { duration: false });
    const c = meta.common || {};
    if (c.title) result.title = c.title;
    if (c.artist) result.artist = c.artist;
    if (c.album) result.album = c.album;
    const pics = c.picture;
    if (pics && pics.length) {
      const pic = pics[0];
      result.cover = `data:${pic.format};base64,${Buffer.from(pic.data).toString('base64')}`;
    }
  } catch (_) {}
  return result;
}

async function pickFolder() {
  dialogOpen = true;
  try {
    const res = await dialog.showOpenDialog(win, {
      title: 'Choose a music folder',
      defaultPath: resolveMusicFolder(),
      properties: ['openDirectory']
    });
    if (!res.canceled && res.filePaths[0]) {
      store.set('musicFolder', res.filePaths[0]);
      store.set('source', 'folder');
      if (win) win.webContents.send('folder-changed', res.filePaths[0]);
      return res.filePaths[0];
    }
  } finally {
    dialogOpen = false;
    if (win && win.isVisible()) win.focus();
  }
  return null;
}

function handleIpc(channel, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!trustedSender(event, win, ENTRY_URL)) throw new Error('Untrusted IPC sender');
    return handler(event, ...args);
  });
}

handleIpc('get-state', () => ({
  version: app.getVersion(),
  musicFolder: resolveMusicFolder(),
  favorites: store.get('favorites'),
  volume: store.get('volume'),
  shuffle: store.get('shuffle'),
  repeat: store.get('repeat'),
  theme: store.get('theme'),
  lastTrack: store.get('lastTrack'),
  source: store.get('source'),
  ambient: store.get('ambient'),
  ambientVol: store.get('ambientVol'),
  precip: store.get('precip'),
  background: store.get('background'),
  eqPreset: store.get('eqPreset'),
  eqCustom1: store.get('eqCustom1'),
  eqCustom2: store.get('eqCustom2'),
  pinned: store.get('pinned')
}));
handleIpc('list-tracks', async () => {
  const dir = resolveMusicFolder();
  return { folder: dir, tracks: await buildTrackList(dir) };
});
handleIpc('track-meta', async (_e, file) => {
  const real = await mediaAccess.resolve(file, true);
  if (!real) throw new Error('Track is not in the music library or selected files');
  return readMeta(real);
});
handleIpc('pick-folder', async () => pickFolder());
handleIpc('set-setting', async (_e, key, value) => {
  if (!EDITABLE.has(key) || !validSetting(key, value)) return false;
  if (key === 'lastTrack' && value && !(await mediaAccess.resolve(value, true))) return false;
  if (key === 'favorites') {
    const previous = new Set(store.get('favorites'));
    for (const file of value) {
      if (!previous.has(file) && !(await mediaAccess.resolve(file, true))) return false;
    }
    value = [...new Set(value)];
  }
  store.set(key, value);
  return true;
});
handleIpc('set-pinned', (_e, value) => {
  if (typeof value !== 'boolean') return pinned;
  pinned = value;
  store.set('pinned', pinned);
  if (win) win.setAlwaysOnTop(true);
  return pinned;
});
handleIpc('pick-background', async () => {
  dialogOpen = true;
  try {
    const res = await dialog.showOpenDialog(win, {
      title: 'Choose a background image',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif'] }]
    });
    if (!res.canceled && res.filePaths[0]) {
      const src = res.filePaths[0];
      const ext = path.extname(src).toLowerCase();
      if (!Object.hasOwn(IMAGE_MIME, ext)) return null;
      const previous = store.get('background');
      const dest = path.join(app.getPath('userData'), 'bg-' + Date.now() + ext);
      await fsp.copyFile(src, dest);
      store.set('background', dest);
      await mediaAccess.setBackground(dest);
      if (previous !== dest) await removeManagedBackground(previous);
      return dest;
    }
  } finally {
    dialogOpen = false;
    if (win && win.isVisible()) win.focus();
  }
  return null;
});
async function removeManagedBackground(file) {
  if (!file || path.dirname(file) !== app.getPath('userData') ||
      !/^(?:bg-\d+|background)\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(path.basename(file))) return;
  await fsp.unlink(file).catch(() => {});
}
handleIpc('clear-background', async () => {
  const cur = store.get('background');
  store.set('background', '');
  await mediaAccess.setBackground('');
  await removeManagedBackground(cur);
  return true;
});
handleIpc('pick-tracks', async () => {
  dialogOpen = true;
  try {
    const res = await dialog.showOpenDialog(win, {
      title: 'Select music',
      defaultPath: resolveMusicFolder(),
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Audio', extensions: [...AUDIO_EXTS].map(e => e.replace('.', '')) }]
    });
    if (!res.canceled && res.filePaths.length) {
      return { files: await mediaAccess.allowAudio(res.filePaths) };
    }
  } finally {
    dialogOpen = false;
    if (win && win.isVisible()) win.focus();
  }
  return null;
});
handleIpc('get-pending-file', () => { const f = pendingFile; pendingFile = null; return f; });
handleIpc('open-current-folder', () => shell.openPath(resolveMusicFolder()));
ipcMain.on('hide-window', event => { if (trustedSender(event, win, ENTRY_URL)) win.hide(); });

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', async (_e, argv) => {
    const f = fileFromArgv(argv);
    if (f) await handleOpenFile(f);
    else toggleWindow();
  });

  app.whenReady().then(async () => {
    const resources = new Set(['/index.html', '/renderer.js', '/styles.css']);
    protocol.handle('app', request => {
      const url = new URL(request.url);
      if (url.host !== 'vinyl' || !resources.has(url.pathname) || !['GET', 'HEAD'].includes(request.method)) {
        return new Response(null, { status: 404 });
      }
      return net.fetch(pathToFileURL(path.join(__dirname, 'renderer', url.pathname.slice(1))).toString(), {
        method: request.method
      });
    });
    protocol.handle('media', createMediaHandler(mediaAccess));
    await mediaAccess.allowAudio([...store.get('favorites'), store.get('lastTrack')]);
    await mediaAccess.setBackground(store.get('background'));

    const initFile = fileFromArgv(process.argv);
    if (initFile && (await mediaAccess.allowAudio([initFile])).length) {
      pendingFile = initFile;
      store.set('musicFolder', path.dirname(initFile));
      store.set('source', 'folder');
    }
    if (app.dock) app.dock.hide();
    pinned = !!store.get('pinned');
    createWindow();
    createTray();
    applyAutostart();
    if (pendingFile) {
      win.webContents.once('did-finish-load', () => {
        positionWindowNearTray(); win.show(); win.focus();
      });
    }

  });

  app.on('window-all-closed', () => {});
  app.on('before-quit', () => { isQuitting = true; });
}
