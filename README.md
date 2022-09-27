# VSCode extension for Aya
GitHub actions is enabled for this project, but we cannot attach SVGs to the README due to VSCode restrictions.

## Download

You can download the release version of the extension itself from [Marketplace](https://marketplace.visualstudio.com/items?itemName=aya-prover.aya-prover-vscode).
We also offer per-commit builds from [the Release page](https://github.com/aya-prover/aya-vscode/releases/tag/nightly-build).

To use this extension, you might also need [the Language Server for Aya](https://github.com/aya-prover/aya-dev/releases),
which is either available as a fat-jar (`lsp-fatjar.jar`) or a jlinked image (`aya-prover-jlink-*.zip`).

## Build from source

You need `yarn` to build this project and `vsce` to package it as an installable extension pack.

```bash
# Install build tools
npm install -g vsce yarn
# Install dependencies
yarn install
# Package the extension to `aya-prover-vscode-<version>.vsix`
vsce package
```
