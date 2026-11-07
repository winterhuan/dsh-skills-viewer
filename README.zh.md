# @winterhuan/dsh-client-ui-skill-viewer

[English](README.md) | 中文

在 dsh web 中浏览和搜索技能。

[插件说明](packages/winterhuan/ui-skill-viewer/README.zh.md) · [发布包](https://github.com/winterhuan/dsh-client-ui-skill-viewer/releases/download/v0.1.5-rc.3/winterhuan-dsh-client-ui-skill-viewer-0.1.5-rc.3.tgz)

请从插件市场安装[技能查看器](https://github.com/winterhuan/dsh-skill-viewer#readme)来使用此客户端。技能查看器组合包已包含客户端，此仓库独立维护。

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
