# AUR publishing

The release workflow publishes the `word2card-bin` AUR package for x86_64 after it has built, verified, and published the matching GitHub Release. The generated package downloads the release AppImage and checks its SHA-256 checksum.

## One-time setup

1. Create an [AUR account](https://aur.archlinux.org/register/) and add an SSH public key to it.
2. Add the matching unencrypted private key to this repository as the `AUR_SSH_PRIVATE_KEY` GitHub Actions secret.
3. Add the verified host-key entry for `aur.archlinux.org` as the `AUR_SSH_KNOWN_HOSTS` GitHub Actions secret. Generate it from a trusted machine with `ssh-keyscan -H aur.archlinux.org`, then verify the fingerprint against Arch Linux's published information before saving it.
4. Confirm that `word2card-bin` is available for registration and that the account is authorized to maintain it.

When either secret is absent, releases still publish successfully and the AUR job reports that it was skipped. Once both are present, the next release creates or updates the AUR Git repository automatically.

## Release flow

1. Run **Prepare Release** from `main` and choose the version increment.
2. Merge the generated release pull request.
3. The **Release** workflow runs quality checks, builds the x86_64 AppImage, checks its checksum, publishes the GitHub Release, and synchronizes the AUR package.

The AUR metadata is rendered from `packaging/aur/word2card-bin/PKGBUILD.in`; do not edit the generated `PKGBUILD` in the AUR repository manually.
