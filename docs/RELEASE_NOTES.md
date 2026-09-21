Vinyl's first open-source release includes Windows x64 binaries and the recovered,
maintained source.

- **Setup-x64.exe** installs Vinyl; open it from Start and click its system-tray icon.
- **Windows-x64.zip** runs after extracting the entire archive.
- **Source.zip** contains the corresponding source without installed dependencies.
- **SHA256SUMS.txt**, **build-info.json**, and **package-checks.json** identify the
  build and its automated checks.

This release fixes delayed/stale metadata during playback, changing folders from
Favorites, range streaming, invalid settings, and selected-file access. It adds
renderer sandboxing, pinned development dependencies, MIT license text, and full
production dependency notices. The original application icon and interface are
preserved.

Publication requires successful source checks and real Windows tests of the ZIP,
silent installation, installed-app startup, generated-WAV playback and seeking,
and silent uninstallation. Manual listening, interactive installer screens,
upgrade from 1.6.3, and packaged autostart have not been verified.

**The Windows binaries are unsigned.** Windows may display an unknown publisher.
Electron and Chromium license notices remain included in the distribution.

نسخهٔ نصب‌شونده و نسخهٔ بدون نصب ویندوز ۶۴ بیتی آماده‌اند. برنامه از آیکون کنار ساعت
باز می‌شود. سورس، مجوزها، نتیجهٔ تست و مقدار SHA-256 نیز همراه این انتشار ارائه شده‌اند.
