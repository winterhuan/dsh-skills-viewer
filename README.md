# @winterhuan/dsh-skill-viewer

English | [中文](README.zh.md)

Read-only skill catalog and body Remote for the skill viewer.

[Plugin documentation](packages/winterhuan/skill-viewer/README.md) · [Release package](https://github.com/winterhuan/dsh-skill-viewer/releases/download/v0.1.5-rc.2/winterhuan-dsh-skill-viewer-0.1.5-rc.2.tgz)

Use pnpm 10.28.0 to install Release URLs into DSH profiles; pnpm 11 can reject them with `MISSING_TARBALL_INTEGRITY`. Repository builds use pnpm 11.7.0.

Use Node 24 (default) or Node 22.19 and later, with pnpm 11.7.0.

```sh
git clone https://github.com/winterhuan/dsh-skill-viewer.git
cd dsh-skill-viewer
git submodule update --init
pnpm install
pnpm run typecheck
pnpm run build
pnpm test
```

The upstream submodule supplies client test sources. Builds use the published DSH dependencies. The plugin source is in `packages/winterhuan/skill-viewer`.
