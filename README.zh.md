# @winterhuan/dsh-skill-viewer

[English](README.md) | 中文

查看 DSH 技能目录、正文和本地参考资料。

[插件说明](packages/winterhuan/skill-viewer/README.zh.md) · [发布包](https://github.com/winterhuan/dsh-skill-viewer/releases/download/v0.1.5-rc.2/winterhuan-dsh-skill-viewer-0.1.5-rc.2.tgz)

通过 Release 地址安装到 DSH profile 时使用 pnpm 10.28.0；pnpm 11 可能报 `MISSING_TARBALL_INTEGRITY`。仓库构建使用 pnpm 11.7.0。

默认使用 Node 24，也兼容 Node 22.19 及以上；pnpm 版本为 11.7.0。

```sh
git clone https://github.com/winterhuan/dsh-skill-viewer.git
cd dsh-skill-viewer
git submodule update --init
pnpm install
pnpm run typecheck
pnpm run build
pnpm test
```

upstream 子模块提供客户端测试源码。构建使用发布版 DSH 依赖。插件源码位于 `packages/winterhuan/skill-viewer`。
