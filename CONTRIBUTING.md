# Contributing

Use Node.js 24 and `npm ci`, then run:

```sh
npm run check
npm test
npm run notices:check
```

On Windows, run `npm run test:electron` for the real source application and
`npm run build:win` for the installer and ZIP. Keep changes focused and describe
the problem, resulting behavior, and checks in your pull request.

When changing production dependencies, run `npm run notices` and commit both the
lockfile and updated notices. If a package omits its license text, retain the
matching upstream version in `licenses/` and record its source URL.

## Packaged tests

`npm run test:package` is restricted to a disposable Windows CI runner because
it installs and uninstalls the application. It uses temporary music/settings,
an explicit `--user-data-dir` and a debugger bound to localhost. It does not
enable a debugger in normal launches. The workflow collects a screenshot and
test results alongside the release files.

## Releasing

1. Update the version with `npm version patch --no-git-tag-version` (or the
   appropriate minor/major increment), and update CHANGELOG.md and
   docs/RELEASE_NOTES.md.
2. Commit the intended release source and push a branch named
   `release/v<VERSION>`. This is an explicit publication trigger.
3. The Windows workflow checks source and packages, builds the installer and
   ZIP, verifies installation/playback/uninstallation, and uploads artifacts.
   Only a successful build proceeds to release publication. It verifies asset
   hashes, creates a draft, uploads all files, then publishes the release.
4. Fast-forward `main` to the verified release commit if it is not already there.

You can also run the Windows workflow manually with **publish** unchecked to
build artifacts only. Existing releases are not overwritten; use a new version
for a new publication. A failed partial upload may leave a draft for the
maintainer to inspect before retrying.

Code signing is disabled for this community release. A future signed release
needs a maintainer-provided certificate or signing service configuration.
