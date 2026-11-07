# @winterhuan/dsh-client-ui-skill-viewer

[English](README.md) | 中文

在 dsh web 中浏览和搜索技能。

[插件说明](packages/winterhuan/ui-skill-viewer/README.zh.md) · [发布包](https://github.com/winterhuan/dsh-client-ui-skill-viewer/releases/download/v0.1.5-rc.2/winterhuan-dsh-client-ui-skill-viewer-0.1.5-rc.2.tgz)

默认使用 Node 24，也兼容 Node 22.19 及以上；pnpm 版本为 11.7.0。

```sh
git clone https://github.com/winterhuan/dsh-client-ui-skill-viewer.git
cd dsh-client-ui-skill-viewer
git submodule update --init
pnpm install
pnpm run typecheck
pnpm run build
pnpm test
```

upstream 子模块提供客户端测试源码。构建使用发布版 DSH 依赖。插件源码位于 `packages/winterhuan/ui-skill-viewer`。
