# Changelog

## 1.6.4 — initial open-source release (2026-09-21)

### Fixed

- Start playback independently of metadata loading and ignore stale metadata
  when tracks change quickly.
- Reset the selected queue when changing folders and clear the previous row's
  playing marker.
- Restore saved ambience layers and show playback/load errors.
- Stream media in bounded chunks, correctly handle suffix and open byte ranges,
  and return 416 for invalid ranges.
- Validate stored and incoming settings, restrict file access to selected media,
  and verify IPC senders.
- Serve the UI through a restricted application protocol and enable renderer
  sandboxing.
- Preserve the previous background if copying a replacement fails, and remove
  only the managed background file.
- Avoid registering the development Electron executable for Windows autostart.
- Upgrade the runtime and metadata parser; use a lazy dynamic import for the
  parser's ESM interface.

### Added

- Node.js 24 setup, a dependency lockfile, and install/run instructions.
- Regression tests, a real Electron smoke test, and Linux/Windows CI checks.
- Windows x64 NSIS installer and ZIP builds with the original application icon.
- MIT license text, production dependency notices, and a Windows usage guide.
- Real packaged-app checks for ZIP startup, silent installation, playback,
  seeking, and uninstallation before publication.
- Release source archive, SHA-256 checksums, build information, and test evidence.
- Explicit `--user-data-dir` support for isolated application settings and profile data.

The Windows binaries are unsigned. Manual listening, interactive installer
screens, upgrade from 1.6.3, and packaged autostart remain unverified.

## 1.6.3 — recovered baseline

- Recovered the eight application files without modification from the supplied
  Windows application and published them with a README and `.gitignore`.
