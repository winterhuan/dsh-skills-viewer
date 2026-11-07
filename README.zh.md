# DSH Skills Viewer

[English](README.md) | 中文

在 DeepSeek Harness Web 中浏览当前会话的技能、完整指令和本地参考文件。

**只安装一个组合包** `@winterhuan/dsh-skill-viewer`。它随包包含客户端 `@winterhuan/dsh-client-ui-skill-viewer`；两个包在此仓库共同维护，统一发布为 `0.1.8`。

## 安装

在 DSH `0.2.2-rc.1` 的「插件 → 发现」添加 `https://winterhuan.github.io/dsh-creative/index.json`，安装技能查看器。也可以安装预构建版本：

```sh
dsh plugin --profile web add 'git+https://github.com/winterhuan/dsh-skills-viewer.git#v0.1.8&path:/plugin'
```

重启 DSH 后，打开侧边栏底部的**技能**。客户端无需单独安装。

[服务端说明](packages/winterhuan/skill-viewer/README.zh.md) · [客户端说明](packages/winterhuan/ui-skill-viewer/README.zh.md) · [发布版本](https://github.com/winterhuan/dsh-skills-viewer/releases/tag/v0.1.8)

## 开发

使用 Node 24 或 Node 22.19 及以上版本，pnpm 11.7.0。两个包使用本地 workspace 依赖。upstream 子模块提供客户端测试源码；构建使用发布版 DSH 依赖。

```sh
git clone https://github.com/winterhuan/dsh-skills-viewer.git
cd dsh-skills-viewer
git submodule update --init
pnpm install
pnpm run typecheck
pnpm run build
pnpm test
```

服务端包位于 `packages/winterhuan/skill-viewer`，客户端位于 `packages/winterhuan/ui-skill-viewer`。

`pnpm run build` 同时生成预构建的 `plugin/` 目录和 `.artifacts/` 中的组合压缩包。Git 安装使用 `plugin/`，其中包含两个组件，无需构建或访问其他插件仓库。
