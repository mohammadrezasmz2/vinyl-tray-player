# Vinyl

A turntable-style tray music player for Windows, built with Electron.

## Run from source

Install Node.js 24 and Git on Windows, then run:

```sh
git clone https://github.com/mohammadrezasmz2/vinyl-tray-player.git
cd vinyl-tray-player
npm ci
npm start
```

The first launch downloads the pinned Electron runtime. Vinyl starts in the
system tray: click its icon to open the player, then choose a music folder or
individual audio files. Use the tray menu to quit.

Development runs do not register Windows autostart. That setting is enabled
only in a packaged Windows application.

## Features

- Local audio library, favorites, shuffle, and repeat.
- Turntable interface, themes, custom backgrounds, and a six-band equalizer.
- Ambient sound layers with saved volume and intensity settings.
- Tray controls, pinning, and opening audio files from the command line.

The library recognizes MP3, M4A/MP4, AAC, FLAC, WAV, OGG/OGA, Opus, and
WebM/WebA files. Actual playback depends on the file's codec and the Electron
runtime.

## Development checks

```sh
npm run check
npm test
npm audit
```

On Windows, also run `npm run test:electron`. This launches the real application
with temporary settings and a generated WAV file, and checks the sandboxed UI,
IPC, media access, metadata, playback, and seeking.

GitHub Actions runs the source checks and regression tests on Linux and Windows,
and the Electron smoke test on Windows. It uses the committed lockfile and
Node.js 24.

## Project files

- `main.js`: Electron main process, tray menu, settings, and local media access.
- `lib/`: media streaming, validated settings, and IPC sender checks.
- `preload.js`: renderer-to-main IPC bridge.
- `renderer/index.html`, `renderer/renderer.js`, `renderer/styles.css`: player UI.
- `assets/`: tray icons.
- `scripts/`, `test/`, `.github/workflows/`: development and regression checks.
- `package.json`, `package-lock.json`: application metadata and pinned dependencies.

## Source and release status

The current development source is **1.6.4**. It uses Electron 44.4.3,
electron-store 8.2.0, and music-metadata 11.15.0. See [CHANGELOG.md](CHANGELOG.md)
for fixes and [the Persian stage-3 review](docs/STAGE_3_REVIEW.fa.md) for the
remaining publication work.

The original 1.6.3 source was recovered from `resources/app.asar` in the supplied
Windows package. All 895 ASAR entries matched their stored SHA-256 hashes. The
eight original application files are preserved at
[the recovery baseline](https://github.com/mohammadrezasmz2/vinyl-tray-player/tree/a9c4f4a915e9e9027e66e09e201b666fa64b8bc0).
That package bundled Electron 31.7.7 and music-metadata 7.14.0.

Installer configuration and a downloadable release are still pending. This
source update does not include a newly built Windows executable. Installer,
upgrade, packaged autostart, and manual listening checks remain to be completed.
Generated runtimes and `node_modules` are excluded from Git.

## License metadata

The supplied `package.json` declares `MIT` and author `Vinyl`. It does not contain
a separate application license text. Adding that file and completing third-party
notices remain part of the final publication stage.

## فارسی

این مخزن مستقل برای Vinyl است. سورس اولیه از نسخهٔ ویندوزی ۱.۶.۳ بازیابی شده
و نسخهٔ توسعهٔ ۱.۶.۴ شامل اصلاح پخش، تنظیمات و دسترسی به فایل‌هاست.
برای اجرا روی ویندوز، Node.js 24 را نصب کنید و دستورهای بالا را اجرا کنید؛
برنامه از آیکون کنار ساعت باز می‌شود. ساخت نصب‌کننده و انتشار نهایی در مرحلهٔ ۴
انجام می‌شود. [گزارش تغییرات و موارد باقی‌مانده](docs/STAGE_3_REVIEW.fa.md)
