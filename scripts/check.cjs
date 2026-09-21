'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const sources = ['main.js', 'preload.js'];
for (const dir of ['lib', 'renderer', 'scripts', 'test']) {
  for (const file of fs.readdirSync(path.join(root, dir))) {
    if (/\.(?:c?js)$/.test(file)) sources.push(`${dir}/${file}`);
  }
}
for (const file of sources) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${file}: ${result.stderr}`);
}
const html = fs.readFileSync(path.join(root, 'renderer/index.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
const renderer = fs.readFileSync(path.join(root, 'renderer/renderer.js'), 'utf8');
for (const match of renderer.matchAll(/(?:\$|document\.getElementById)\(['"]([^'"]+)['"]\)/g)) {
  assert.ok(ids.includes(match[1]), `Missing HTML control: ${match[1]}`);
}
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json')));
assert.equal(pkg.version, lock.packages[''].version, 'Lockfile version must match');
assert.deepEqual(pkg.dependencies, lock.packages[''].dependencies);
assert.deepEqual(pkg.devDependencies, lock.packages[''].devDependencies);
console.log(`Checked ${sources.length} JavaScript files, ${ids.length} HTML IDs and the lockfile.`);
