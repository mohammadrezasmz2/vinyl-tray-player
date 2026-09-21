'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { version } = require('../package.json');
const root = path.join(__dirname, '..'), dist = path.join(root, 'dist'), output = path.join(dist, 'release');
assert.match(version, /^\d+\.\d+\.\d+$/);
const checks = JSON.parse(fs.readFileSync(path.join(dist, 'validation/package-checks.json')));
assert.equal(checks.status, 'passed'); assert.equal(checks.version, version);
fs.mkdirSync(output, { recursive: true });
for (const file of [`Vinyl-${version}-Setup-x64.exe`, `Vinyl-${version}-Windows-x64.zip`]) {
  fs.copyFileSync(path.join(dist, file), path.join(output, file));
}
for (const [source, target] of [['LICENSE', 'LICENSE.txt'], ['THIRD_PARTY_NOTICES.txt', 'THIRD_PARTY_NOTICES.txt'],
  ['dist/validation/package-checks.json', 'package-checks.json'], ['dist/validation/installed-window.png', `Vinyl-${version}.png`]]) {
  fs.copyFileSync(path.join(root, source), path.join(output, target));
}
execFileSync('git', ['archive', '--format=zip', '--prefix=vinyl-tray-player/', '-o', path.join(output, `Vinyl-${version}-Source.zip`), 'HEAD'], { cwd: root });
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
fs.writeFileSync(path.join(output, 'build-info.json'), JSON.stringify({ version, commit, electron: require('../package.json').devDependencies.electron,
  platform: process.platform, architecture: process.arch, windowsChecks: 'passed', signed: false,
  workflow: process.env.GITHUB_RUN_ID ? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : null }, null, 2) + '\n');
(async () => {
  const lines = [];
  for (const name of fs.readdirSync(output).filter(name => name !== 'SHA256SUMS.txt').sort()) {
    const hash = crypto.createHash('sha256');
    for await (const chunk of fs.createReadStream(path.join(output, name))) hash.update(chunk);
    lines.push(`${hash.digest('hex')}  ${name}`);
  }
  fs.writeFileSync(path.join(output, 'SHA256SUMS.txt'), lines.join('\n') + '\n');
  console.log(`Prepared ${lines.length} checked release assets and SHA256SUMS.txt.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
