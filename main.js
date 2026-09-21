'use strict';

const {
  app, BrowserWindow, Tray, Menu, ipcMain, dialog,
  protocol, nativeImage, shell, screen
} = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const Store = require('electron-store');
const mm = require('music-metadata');

const MIME = {
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.mp4': 'audio/mp4',
  '.aac': 'audio/aac', '.flac': 'audio/flac', '.wav': 'audio/wav',
  '.ogg': 'audio/ogg', '.oga': 'audio/ogg', '.opus': 'audio/ogg',
  '.webm': 'audio/webm', '.weba': 'audio/webm'
};
const AUDIO_EXTS = new Set(Object.keys(MIME));
const IMG_MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.bmp': 'image/bmp', '.avif': 'image/avif'
};

const store = new Store({
  name: 'vinyl-settings',
  defaults: {
    musicFolder: '',
    favorites: [],
    volume: 0.85,
    shuffle: false,
    repeat: 'off',   // 'off' | 'all' | 'one'
    theme: 0,
    lastTrack: '',
    source: 'folder', // 'folder' | 'favorites'
    autostart: true,  // launch with Windows so it's in the tray after reboot
    ambient: [],      // active ambience layers: rain, thunder, fire, wind
    ambientVol: 0.5,  // ambience mix volume
    precip: 0.5,      // rainfall / precipitation intensity (0..1)
    background: '',   // path to a user-uploaded background image
    eqPreset: 'flat', // equalizer preset id
    eqCustom1: [0, 0, 0, 0, 0, 0],
    eqCustom2: [0, 0, 0, 0, 0, 0],
    pinned: false     // keep the window open (don't hide on blur)
  }
});

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

function handleOpenFile(fp) {
  if (!fp) return;
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
  { scheme: 'media', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: true } }
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
      sandbox: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

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
    } else if (AUDIO_EXTS.has(path.extname(ent.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}
function cleanName(file) {
  return path.basename(file, path.extname(file)).replace(/[_]+/g, ' ').trim();
}
async function buildTrackList(dir) {
  const files = await scanFolder(dir);
  files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return files.map((f) => ({ path: f, name: cleanName(f) }));
}

async function readMeta(file) {
  const result = { title: cleanName(file), artist: '', album: '', cover: null };
  try {
    const meta = await mm.parseFile(file, { duration: false });
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

ipcMain.handle('get-state', () => ({
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
ipcMain.handle('list-tracks', async () => {
  const dir = resolveMusicFolder();
  return { folder: dir, tracks: await buildTrackList(dir) };
});
ipcMain.handle('track-meta', async (_e, file) => readMeta(file));
ipcMain.handle('pick-folder', async () => pickFolder());
ipcMain.handle('set-setting', (_e, key, value) => {
  const allowed = ['favorites', 'volume', 'shuffle', 'repeat', 'theme', 'lastTrack', 'source', 'ambient', 'ambientVol', 'precip', 'eqPreset', 'eqCustom1', 'eqCustom2'];
  if (allowed.includes(key)) store.set(key, value);
  return true;
});
ipcMain.handle('set-pinned', (_e, value) => {
  pinned = !!value;
  store.set('pinned', pinned);
  if (win) win.setAlwaysOnTop(true);
  return pinned;
});
ipcMain.handle('pick-background', async () => {
  dialogOpen = true;
  try {
    const res = await dialog.showOpenDialog(win, {
      title: 'Choose a background image',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif'] }]
    });
    if (!res.canceled && res.filePaths[0]) {
      const src = res.filePaths[0];
      const ext = path.extname(src).toLowerCase() || '.png';
      const udir = app.getPath('userData');
      try {
        for (const f of fs.readdirSync(udir)) {
          if (/^(background|bg-)/i.test(f)) { try { fs.unlinkSync(path.join(udir, f)); } catch (_) {} }
        }
      } catch (_) {}
      const dest = path.join(udir, 'bg-' + Date.now() + ext);
      fs.copyFileSync(src, dest);
      store.set('background', dest);
      return dest;
    }
  } finally {
    dialogOpen = false;
    if (win && win.isVisible()) win.focus();
  }
  return null;
});
ipcMain.handle('clear-background', () => {
  const cur = store.get('background');
  if (cur) { try { fs.unlinkSync(cur); } catch (_) {} }
  store.set('background', '');
  return true;
});
ipcMain.handle('pick-tracks', async () => {
  dialogOpen = true;
  try {
    const res = await dialog.showOpenDialog(win, {
      title: 'Select music',
      defaultPath: resolveMusicFolder(),
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Audio', extensions: [...AUDIO_EXTS].map(e => e.replace('.', '')) }]
    });
    if (!res.canceled && res.filePaths.length) {
      return { files: res.filePaths };
    }
  } finally {
    dialogOpen = false;
    if (win && win.isVisible()) win.focus();
  }
  return null;
});
ipcMain.handle('get-pending-file', () => { const f = pendingFile; pendingFile = null; return f; });
ipcMain.handle('open-current-folder', () => { shell.openPath(resolveMusicFolder()); });
ipcMain.on('hide-window', () => { if (win) win.hide(); });

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    const f = fileFromArgv(argv);
    if (f) handleOpenFile(f);
    else toggleWindow();
  });

  app.whenReady().then(() => {
    // media:// with byte-range support. Fixed-length Buffer bodies (not chunked
    // streams) so the browser gets a real Content-Length, learns duration, seeks.
    protocol.handle('media', async (request) => {
      let fh;
      try {
        const url = new URL(request.url);
        const filePath = decodeURIComponent(url.pathname.replace(/^\//, ''));
        const stat = await fsp.stat(filePath);
        const size = stat.size;
        const mime = MIME[path.extname(filePath).toLowerCase()] || IMG_MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

        if (request.method === 'HEAD') {
          return new Response(null, {
            status: 200,
            headers: { 'Content-Type': mime, 'Content-Length': String(size), 'Accept-Ranges': 'bytes' }
          });
        }

        const rangeHeader = request.headers.get('Range') || request.headers.get('range');
        if (rangeHeader) {
          const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
          let start = m && m[1] ? parseInt(m[1], 10) : 0;
          let end = m && m[2] ? parseInt(m[2], 10) : size - 1;
          if (isNaN(start) || start < 0) start = 0;
          if (isNaN(end) || end >= size) end = size - 1;
          if (start > end) start = 0;
          const chunk = end - start + 1;
          // Serve the exact requested range (no cap) so the browser learns the
          // true length and can seek anywhere. bytes=0- returns the whole file.
          let buf;
          if (start === 0 && end === size - 1) {
            buf = await fsp.readFile(filePath);
          } else {
            buf = Buffer.allocUnsafe(chunk);
            fh = await fsp.open(filePath, 'r');
            await fh.read(buf, 0, chunk, start);
            await fh.close(); fh = null;
          }
          return new Response(buf, {
            status: 206,
            headers: {
              'Content-Type': mime,
              'Content-Length': String(chunk),
              'Content-Range': `bytes ${start}-${end}/${size}`,
              'Accept-Ranges': 'bytes'
            }
          });
        }

        const buf = await fsp.readFile(filePath);
        return new Response(buf, {
          status: 200,
          headers: { 'Content-Type': mime, 'Content-Length': String(size), 'Accept-Ranges': 'bytes' }
        });
      } catch (err) {
        if (fh) { try { await fh.close(); } catch (_) {} }
        return new Response('Not found', { status: 404 });
      }
    });

    if (app.dock) app.dock.hide();
    pinned = !!store.get('pinned');
    createWindow();
    createTray();
    applyAutostart();

    const initFile = fileFromArgv(process.argv);
    if (initFile) {
      pendingFile = initFile;
      store.set('musicFolder', path.dirname(initFile));
      store.set('source', 'folder');
      win.webContents.once('did-finish-load', () => {
        positionWindowNearTray(); win.show(); win.focus();
      });
    }
  });

  app.on('window-all-closed', () => {});
  app.on('before-quit', () => { isQuitting = true; });
}
