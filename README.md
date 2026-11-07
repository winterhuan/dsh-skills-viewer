# DSH Skills Viewer

English | [中文](README.zh.md)

Browse the current session's skills, full instructions, and local reference files in DeepSeek Harness Web.

Install **one bundle**, `@winterhuan/dsh-skill-viewer`. It includes the client `@winterhuan/dsh-client-ui-skill-viewer`; both packages are maintained here and released together at `0.1.8`.

## Install

For DSH `0.2.2-rc.1`, add `https://winterhuan.github.io/dsh-creative/index.json` in Plugins → Discover and install Skill viewer. Or install the prebuilt release:

```sh
dsh plugin --profile web add 'git+https://github.com/winterhuan/dsh-skills-viewer.git#v0.1.8&path:/plugin'
```

Restart DSH, then open **Skills** at the bottom of the sidebar. The client needs no separate installation.

[Host documentation](packages/winterhuan/skill-viewer/README.md) · [Client documentation](packages/winterhuan/ui-skill-viewer/README.md) · [Release](https://github.com/winterhuan/dsh-skills-viewer/releases/tag/v0.1.8)

## Development

Use Node 24 or Node 22.19 and later, with pnpm 11.7.0. The two packages use local workspace dependencies. The upstream submodule supplies client test sources; builds use published DSH dependencies.

```sh
git clone https://github.com/winterhuan/dsh-skills-viewer.git
cd dsh-skills-viewer
git submodule update --init
pnpm install
pnpm run typecheck
pnpm run build
pnpm test
```

The Host package is in `packages/winterhuan/skill-viewer`; the client is in `packages/winterhuan/ui-skill-viewer`.

`pnpm run build` also creates the prebuilt `plugin/` directory and a bundled archive in `.artifacts/`. Git installation uses `plugin/`, which contains both components and requires no build or access to another plugin repository.
