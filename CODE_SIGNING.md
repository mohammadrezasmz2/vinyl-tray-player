# Code signing policy

Updated: September 22, 2026.

## Current status

**Vinyl v1.6.4 is unsigned. No SignPath Foundation certificate has been granted
to this project.** The maintainer submitted an application for SignPath's
free open-source program on September 22, 2026. The application is awaiting
the Foundation's review; submission does not imply acceptance.

If accepted, the intended arrangement is: free code signing provided by
[SignPath.io](https://signpath.io/), certificate by
[SignPath Foundation](https://signpath.org/). The certificate would identify
SignPath Foundation as the publisher. This is a proposed arrangement, not a
claim of current sponsorship or an existing signed release.

## Maintainer and signing roles

| Role | Responsible maintainer |
| --- | --- |
| Committer and maintainer | [mohammadrezasmz2](https://github.com/mohammadrezasmz2) |
| Reviewer of external contributions | [mohammadrezasmz2](https://github.com/mohammadrezasmz2) |
| Release and signing approver | [mohammadrezasmz2](https://github.com/mohammadrezasmz2) |

Before signing is enabled, GitHub and SignPath access used for signing must
have multi-factor authentication. External contributions require maintainer
review. Each production signing request requires explicit maintainer approval;
a successful automated build alone does not authorize signing.

## Planned release process

Signed releases must originate from this public repository's reviewed source
and automated GitHub Actions builds. The signing configuration must restrict
the project identity, product name and version of Vinyl's artifacts.
Third-party binaries retain their upstream identity; they must not be signed
as if maintained by Vinyl.

The first signed release must verify the signatures and timestamps of the
application and installer components, include the signed executable in the
ZIP, and pass the Windows package checks. SHA-256 checksums must describe the
final signed downloads. A signed release will use a new version and will not
silently replace the unsigned v1.6.4 downloads.

## Privacy and reports

See the [Privacy policy](PRIVACY.md) for local data and network behavior.
Report release problems through this repository's issues. Include the release
version and steps to reproduce, without posting private keys, credentials or
personal data.

The proposed service is governed by the Foundation's
[conditions](https://signpath.org/terms). Violations may result in suspension
or certificate revocation. A valid signature identifies the signer and helps
detect changes; it does not guarantee that every Windows reputation warning
will disappear immediately.
