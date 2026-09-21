'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json')));
const fallback = {
  'type-fest@2.19.0': 'licenses/type-fest-2.19.0-MIT.txt',
  '@tokenizer/token@0.3.0': 'licenses/tokenizer-token-0.3.0-MIT.txt'
};
const records = new Map();
for (const [relative, entry] of Object.entries(lock.packages)) {
  if (!relative || entry.dev || entry.devOptional) continue;
  const dir = path.join(root, relative);
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json')));
  const id = `${pkg.name}@${pkg.version}`;
  const names = fs.readdirSync(dir).filter(name => /^(licen[cs]e|copying|notice)(?:[.-]|$)/i.test(name));
  const files = names.map(name => path.join(dir, name)).filter(file => fs.statSync(file).isFile());
  if (!files.length && fallback[id]) files.push(path.join(root, fallback[id]));
  assert.ok(files.length, `Missing license text for ${id}; review it before building`);
  const repository = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url || '';
  const body = files.sort().map(file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').trim()).join('\n\n');
  records.set(id, `${id}\nLicense: ${pkg.license}\nSource: ${repository}\n\n${body}`);
}
const ids = [...records.keys()].sort();
const header = `Vinyl — third-party notices\n\nGenerated from package-lock.json by npm run notices.\n${ids.length} production package versions are listed below.\n\nElectron and Chromium ship their own LICENSE and LICENSES.chromium.html\nnext to Vinyl.exe; keep those files when redistributing the application.\nThe application license is provided separately in LICENSE.vinyl.txt.\nFor upstream license source links, see licenses/README.md in the source tree.\n\n`;
const result = header + ids.map(id => `${'='.repeat(72)}\n${records.get(id)}\n`).join('\n');
const target = path.join(root, 'THIRD_PARTY_NOTICES.txt');
if (process.argv.includes('--check')) assert.equal(fs.readFileSync(target, 'utf8'), result, 'Run npm run notices after changing production dependencies');
else fs.writeFileSync(target, result);
console.log(`License texts verified for ${ids.length} production package versions.`);
