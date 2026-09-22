# Privacy policy

Updated: September 22, 2026. This describes Vinyl 1.6.4 distributed by
[this repository](https://github.com/mohammadrezasmz2/vinyl-tray-player).

## Local audio and settings

Vinyl plays audio from your computer. It reads the selected music folder, or
the Windows Music folder when no custom folder is configured, as well as audio
files you explicitly open and previously saved favorite tracks. It reads track
names, tags and embedded artwork locally to display the library and player.

Vinyl saves preferences in `vinyl-settings.json` in Electron's application
user-data directory, normally under the Windows user's application-data folder.
These include music-folder and file paths, favorites, the last track, volume,
shuffle/repeat, theme, equalizer, ambience, pinning and startup preferences.
A background image you select is copied into that directory. Changing or
clearing the background removes the previous copy managed by Vinyl; it does
not delete the original image you selected. Electron also maintains local
profile/cache files in its user-data directory.

These files are local application data, not encrypted storage provided by
Vinyl. Access follows your computer's account and filesystem permissions.

## Network use

Vinyl's application code does not upload your audio, artwork, file paths or
settings to the maintainer or a network service. It has no account system,
advertising, analytics, automatic update downloads or automatic crash-report
uploads. Playback, metadata parsing, equalization and generated ambient sounds
are processed locally. The packaged player uses bundled interface resources.

Visiting the GitHub repository, downloading a release or posting an issue uses
GitHub separately from the player. GitHub processes those interactions under
its own [privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
Information you choose to post in public issues is public. Remove private file
paths and personal information from screenshots and reports before posting.
Installing developer dependencies from source also contacts package providers;
this is separate from normal use of the packaged player.

## Startup, installation and removal

The Windows installer installs for the current user and creates a Start-menu
shortcut. In packaged version 1.6.4, **Start with Windows is enabled by default**.
The player applies that setting when it runs; you can disable it using its
system-tray menu. Development launches do not register Windows startup.

The uninstaller preserves user settings by default. To remove those local
settings and background copies, quit Vinyl and delete its own application
user-data directory. Your original music and image files are not deleted by
uninstalling Vinyl or removing its application data.

## Signing and contact

The [Code signing policy](CODE_SIGNING.md) describes the application for a
future signing service. Code signing concerns release binaries; using the
player does not create a SignPath account or send the user's local library to
SignPath.

For questions, open an issue in the repository without including private data.
The maintainer is [mohammadrezasmz2](https://github.com/mohammadrezasmz2).

## فارسی

Vinyl آهنگ‌ها، اطلاعات قطعه و تصویر جلد را روی رایانهٔ خودتان پردازش می‌کند.
مسیر فایل‌ها، علاقه‌مندی‌ها و تنظیمات در داده‌های محلی برنامه ذخیره می‌شوند؛
تصویر پس‌زمینهٔ انتخابی نیز یک نسخهٔ محلی در همان محل دارد. برنامه این موارد
را برای نگهدارنده ارسال نمی‌کند و حساب کاربری، تبلیغات یا تحلیل رفتار ندارد.
حذف برنامه به‌صورت پیش‌فرض تنظیمات را نگه می‌دارد. شروع خودکار ویندوز در
نسخهٔ بسته‌بندی‌شدهٔ ۱.۶.۴ پیش‌فرض روشن است و از منوی کنار ساعت خاموش می‌شود.
اطلاعاتی که خودتان در Issueهای GitHub منتشر می‌کنید عمومی است.
