# @winterhuan/dsh-client-ui-skill-viewer

English | [中文](README.zh.md)

Web skill viewer panel for the dsh web client.

[Plugin documentation](packages/winterhuan/ui-skill-viewer/README.md) · [Release package](https://github.com/winterhuan/dsh-client-ui-skill-viewer/releases/download/v0.1.5-rc.2/winterhuan-dsh-client-ui-skill-viewer-0.1.5-rc.2.tgz)

Use Node 24 (default) or Node 22.19 and later, with pnpm 11.7.0.

```sh
git clone https://github.com/winterhuan/dsh-client-ui-skill-viewer.git
cd dsh-client-ui-skill-viewer
git submodule update --init
pnpm install
pnpm run typecheck
pnpm run build
pnpm test
```

The upstream submodule supplies client test sources. Builds use the published DSH dependencies. The plugin source is in `packages/winterhuan/ui-skill-viewer`.
