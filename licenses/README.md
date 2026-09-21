# License provenance

The recovered application's package.json declared MIT and author Vinyl. The
root LICENSE supplies the standard MIT text for the open-source project.
Original and third-party copyright notices remain with their respective files.

`npm run notices` collects the full license texts of the locked production
dependencies into THIRD_PARTY_NOTICES.txt. Two npm packages omit their license
text from the tarball, so the matching upstream release text is kept here:

- [type-fest 2.19.0, MIT option](https://github.com/sindresorhus/type-fest/blob/v2.19.0/license-mit).
- [@tokenizer/token 0.3.0, README license section](https://github.com/Borewit/tokenizer-token/blob/v0.3.0/README.md#licence).

The application icon's image resources were recovered unchanged from the
supplied Vinyl.exe; only the ICO directory was reconstructed from their actual
dimensions and lengths. Tray icons and the interface also originate in the
supplied application.

The Windows distribution retains the Electron LICENSE.electron.txt and
LICENSES.chromium.html delivered with its pinned runtime. Build tooling is not
shipped as an application dependency.
