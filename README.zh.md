# @winterhuan/dsh-skill-viewer

[English](README.md) | 中文

查看 DSH 技能目录、正文和本地参考资料。

[插件说明](packages/winterhuan/skill-viewer/README.zh.md) · [发布包](https://github.com/winterhuan/dsh-skill-viewer/releases/download/v0.1.8/winterhuan-dsh-skill-viewer-0.1.8.tgz)

在 DSH `0.2.2-rc.1` 中启用「自定义插件市场」，在「发现」添加 `https://winterhuan.github.io/dsh-creative/index.json`。也可用 pnpm 11.7.0 安装已构建的 Git 版本：

```sh
dsh plugin --profile market add 'git+https://github.com/winterhuan/dsh-skill-viewer.git#f2a01f5ed07d57530710a31c03a3c7e891b08e34&path:/packages/winterhuan/skill-viewer'
```

将 `market` 替换为你已有的 DSH profile 名称。

组合包已内置编译后的客户端依赖，pnpm 不需要下载 Git 子依赖。

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
