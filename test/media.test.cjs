'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { MediaAccess, createMediaHandler } = require('../lib/media.cjs');
const { wave } = require('./fixtures.cjs');

test('media responses preserve exact bytes, suffix ranges and HEAD metadata', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vinyl-media-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'آهنگ #1.wav'), bytes = wave();
  await fs.writeFile(file, bytes);
  const access = new MediaAccess(); await access.allowAudio([file]);
  const serve = createMediaHandler(access), url = 'media://local/' + encodeURIComponent(file);
  const preflight = await serve(new Request(url, { method: 'OPTIONS', headers: {
    Origin: 'app://vinyl', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'range'
  } }));
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'app://vinyl');
  assert.equal(preflight.headers.get('Access-Control-Allow-Headers'), 'Range');
  const head = await serve(new Request(url, { method: 'HEAD' }));
  assert.equal(head.status, 200); assert.equal(head.body, null);
  assert.equal(head.headers.get('Content-Length'), String(bytes.length));
  const full = await serve(new Request(url));
  assert.equal(full.headers.get('Content-Type'), 'audio/wav');
  assert.deepEqual(Buffer.from(await full.arrayBuffer()), bytes);
  for (const [range, start, end] of [['bytes=4-11', 4, 11], ['bytes=-4', bytes.length - 4, bytes.length - 1],
    ['bytes=40-', 40, bytes.length - 1], ['bytes=0-999999', 0, bytes.length - 1]]) {
    const res = await serve(new Request(url, { headers: { Range: range } }));
    assert.equal(res.status, 206);
    assert.equal(res.headers.get('Content-Range'), `bytes ${start}-${end}/${bytes.length}`);
    assert.deepEqual(Buffer.from(await res.arrayBuffer()), bytes.subarray(start, end + 1));
  }
  for (const range of ['bytes=999999-', 'bytes=10-2', 'bytes=-0', 'bytes=-', 'bytes=1-2,4-5', 'not-a-range']) {
    const res = await serve(new Request(url, { headers: { Range: range } }));
    assert.equal(res.status, 416, range);
    assert.equal(res.headers.get('Content-Range'), `bytes */${bytes.length}`);
  }
  const { parseFile } = await import('music-metadata');
  const meta = await parseFile(file);
  assert.equal(meta.format.duration, 2);
});

test('media access rejects unselected paths and handles missing/empty files', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vinyl-access-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'selected.wav'), other = path.join(dir, 'other.wav');
  const secret = path.join(dir, 'settings.json'), image = path.join(dir, 'bg.png');
  for (const f of [file, other, secret, image]) await fs.writeFile(f, '');
  const access = new MediaAccess(); await access.allowAudio([file, secret]);
  const serve = createMediaHandler(access);
  const request = (f, init) => new Request('media://local/' + encodeURIComponent(f), init);
  assert.equal((await serve(request(file))).status, 200);
  assert.equal((await serve(request(file, { headers: { Range: 'bytes=0-' } }))).status, 416);
  for (const f of [other, secret, image, path.join(dir, 'missing.wav')]) assert.equal((await serve(request(f))).status, 404);
  await access.setBackground(image);
  assert.equal(await access.resolve(image, true), null);
  assert.equal((await serve(request(image))).status, 200);
  await access.setBackground('');
  assert.equal((await serve(request(image))).status, 404);
  assert.equal((await serve(request(file, { method: 'POST' }))).status, 405);
  assert.equal((await serve(new Request('media://other/anything'))).status, 400);
  assert.equal((await serve(new Request('media://local/%ZZ'))).status, 400);
  const foreign = request(file); foreign.initiatorOrigin = 'https://example.com';
  assert.equal((await serve(foreign)).status, 403);
  assert.equal((await serve(request(file, { method: 'OPTIONS', headers: {
    Origin: 'https://example.com', 'Access-Control-Request-Method': 'GET'
  } }))).status, 403);
  assert.equal((await serve(request(file, { method: 'OPTIONS', headers: {
    Origin: 'app://vinyl', 'Access-Control-Request-Method': 'POST'
  } }))).status, 403);
  assert.equal((await serve(request(other))).headers.get('Access-Control-Allow-Origin'), 'app://vinyl');
  await fs.unlink(file);
  assert.equal((await serve(request(file))).status, 404);
});

test('large open-ended audio responses stream in bounded chunks and can be cancelled', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vinyl-stream-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'large.wav');
  const handle = await fs.open(file, 'w'); await handle.truncate(64 * 1024 * 1024); await handle.close();
  const access = new MediaAccess(); await access.allowAudio([file]);
  const res = await createMediaHandler(access)(new Request('media://local/' + encodeURIComponent(file), { headers: { Range: 'bytes=0-' } }));
  assert.equal(res.status, 206);
  const reader = res.body.getReader(), chunk = await reader.read();
  assert.ok(chunk.value.byteLength > 0 && chunk.value.byteLength <= 65536);
  await reader.cancel();
});
