# Vinyl

A turntable-style tray music player for Windows, built with Electron.

## Baseline: 1.6.3

This source snapshot was extracted from the user-supplied Windows application
`New folder(4).rar`, from `resources/app.asar`. The eight application files,
including `package.json`, are preserved byte-for-byte. Only this README and
`.gitignore` were added for this initial repository snapshot.

## Project files

- `main.js`: Electron main process, tray menu, settings, and local media access.
- `preload.js`: renderer-to-main IPC bridge.
- `renderer/index.html`, `renderer/renderer.js`, `renderer/styles.css`: player UI.
- `assets/`: tray icons.
- `package.json`: original packaged application metadata.

## Dependencies and build status

The supplied app bundles `electron-store` 8.2.0 and `music-metadata` 7.14.0.
The executable contains the runtime string `Electron/31.7.7`.

The supplied package does not include development scripts, an Electron development
dependency, a lockfile, or installer build configuration. Those still need to be
restored before a reproducible install/run/build workflow can be documented.
This checkpoint is a recovered source baseline, not a tested development release.
Do not expect `npm start` or `npm ci` to work yet.

The large Windows runtime, installer, and bundled `node_modules` are not included
in this source tree. The recovery checkpoint retains the original `app.asar`,
which includes the shipped production dependencies.

## Validation

All 895 files in `app.asar` matched their stored SHA-256 integrity hashes.
The three application JavaScript files passed `node --check`.
Windows playback, tray behavior, autostart, and installer behavior have not been
run in this environment.

## License metadata

The supplied `package.json` declares `MIT` and author `Vinyl`. It does not contain
a separate license text for the application. Adding the application license file
and completing third-party notices remain part of the publication work.

## فارسی

این نسخهٔ پایه از برنامهٔ ویندوزی Vinyl نسخهٔ ۱.۶.۳ استخراج شده است.
هشت فایل اصلی بدون تغییر حفظ شده‌اند. تنظیمات اجرای توسعه و ساخت نصب‌کننده
در بستهٔ ارسالی وجود نداشت و باید در مرحلهٔ بعد تکمیل شود.
