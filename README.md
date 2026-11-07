# @winterhuan/dsh-skill-viewer

English | [中文](README.zh.md)

Read-only skill catalog and body Remote for the skill viewer.

[Plugin documentation](packages/winterhuan/skill-viewer/README.md) · [Release package](https://github.com/winterhuan/dsh-skill-viewer/releases/download/v0.1.5-rc.3/winterhuan-dsh-skill-viewer-0.1.5-rc.3.tgz)

For DSH `0.2.2-rc.1`, enable Custom plugin market and add `https://winterhuan.github.io/dsh-creative/index.json` in Discover. Alternatively, install the prebuilt Git version with pnpm 11.7.0:

```sh
dsh plugin --profile market add 'git+https://github.com/winterhuan/dsh-skill-viewer.git#f2a01f5ed07d57530710a31c03a3c7e891b08e34&path:/packages/winterhuan/skill-viewer'
```

Replace `market` with the name of your existing DSH profile.

The bundle includes its compiled client dependency; pnpm does not fetch a Git subdependency.

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
