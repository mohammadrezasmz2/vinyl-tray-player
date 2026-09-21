'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');
const { Readable } = require('node:stream');

const AUDIO_MIME = {
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.mp4': 'audio/mp4',
  '.aac': 'audio/aac', '.flac': 'audio/flac', '.wav': 'audio/wav',
  '.ogg': 'audio/ogg', '.oga': 'audio/ogg', '.opus': 'audio/ogg',
  '.webm': 'audio/webm', '.weba': 'audio/webm'
};
const IMAGE_MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.bmp': 'image/bmp', '.avif': 'image/avif'
};
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'app://vinyl',
  'Access-Control-Allow-Methods': 'GET, HEAD',
  'Access-Control-Allow-Headers': 'Range',
  'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Range, Content-Length'
};
const emptyResponse = (status, headers = {}) => new Response(null, {
  status, headers: { ...CORS_HEADERS, ...headers }
});

// Only library tracks, previously saved tracks, and explicit dialog selections
// become readable. Resolve symlinks before granting or checking a path.
class MediaAccess {
  constructor() { this.audio = new Set(); this.background = null; }

  async allowAudio(files) {
    const allowed = [];
    for (const file of files) {
      try {
        if (typeof file !== 'string' || !path.isAbsolute(file)) continue;
        const real = await fs.realpath(file);
        if (!Object.hasOwn(AUDIO_MIME, path.extname(real).toLowerCase())) continue;
        this.audio.add(real);
        allowed.push(file);
      } catch { /* Missing saved tracks are not readable. */ }
    }
    return allowed;
  }

  async setBackground(file) {
    this.background = null;
    if (!file) return;
    try {
      const real = await fs.realpath(file);
      if (Object.hasOwn(IMAGE_MIME, path.extname(real).toLowerCase())) this.background = real;
    } catch { /* A removed background is ignored. */ }
  }

  async resolve(file, audioOnly = false) {
    if (typeof file !== 'string' || !path.isAbsolute(file) || file.includes('\0')) return null;
    try {
      const real = await fs.realpath(file);
      return this.audio.has(real) || (!audioOnly && real === this.background) ? real : null;
    } catch { return null; }
  }
}

// null: no range, false: unsupported/unsatisfiable, object: one byte range.
function parseRange(header, size) {
  if (header === null) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2]) || size === 0) return false;
  let start, end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return false;
    start = Math.max(0, size - suffix); end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) return false;
    end = Math.min(end, size - 1);
  }
  return { start, end };
}

function createMediaHandler(access) {
  return async function serveMedia(request) {
    const origin = request.headers.get('Origin');
    if ((request.initiatorOrigin && request.initiatorOrigin !== 'app://vinyl') ||
        (origin && origin !== 'app://vinyl')) {
      return new Response(null, { status: 403 });
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return emptyResponse(405, { Allow: 'GET, HEAD, OPTIONS' });
    }
    let file;
    try {
      const url = new URL(request.url);
      if (url.protocol !== 'media:' || url.host !== 'local' || url.search || url.hash) throw new Error('Invalid media URL');
      file = decodeURIComponent(url.pathname.slice(1));
    } catch { return emptyResponse(400); }
    const real = await access.resolve(file);
    if (!real) return emptyResponse(404);
    if (request.method === 'OPTIONS') {
      const method = request.headers.get('Access-Control-Request-Method');
      const headers = (request.headers.get('Access-Control-Request-Headers') || '')
        .split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
      // Suffix ranges need a preflight; permit only the media API's headers.
      return emptyResponse(['GET', 'HEAD'].includes(method) && headers.every(name => name === 'range') ? 204 : 403);
    }

    let handle;
    try {
      handle = await fs.open(real, 'r');
      const stat = await handle.stat();
      if (!stat.isFile()) return emptyResponse(404);
      const headers = {
        ...CORS_HEADERS,
        'Content-Type': AUDIO_MIME[path.extname(real).toLowerCase()] || IMAGE_MIME[path.extname(real).toLowerCase()],
        'Content-Length': String(stat.size), 'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'
      };
      if (request.method === 'HEAD') return new Response(null, { headers });
      const range = parseRange(request.headers.get('Range'), stat.size);
      if (range === false) {
        return emptyResponse(416, { 'Content-Range': `bytes */${stat.size}` });
      }
      if (stat.size === 0) return new Response(null, { headers });
      const start = range ? range.start : 0;
      const end = range ? range.end : stat.size - 1;
      headers['Content-Length'] = String(end - start + 1);
      if (range) headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;

      // Bounded streaming, including bytes=0-, avoids loading an entire song.
      const stream = handle.createReadStream({ start, end, autoClose: true, highWaterMark: 64 * 1024 });
      handle = null; // The stream now owns the file descriptor.
      const abort = () => stream.destroy();
      request.signal.addEventListener('abort', abort, { once: true });
      stream.once('close', () => request.signal.removeEventListener('abort', abort));
      if (request.signal.aborted) abort();
      return new Response(Readable.toWeb(stream, {
        strategy: { highWaterMark: 64 * 1024, size: chunk => chunk.byteLength }
      }), { status: range ? 206 : 200, headers });
    } catch { return emptyResponse(404); }
    finally { if (handle) await handle.close().catch(() => {}); }
  };
}

module.exports = { AUDIO_MIME, IMAGE_MIME, MediaAccess, parseRange, createMediaHandler };
