# @winterchenhuan/dsh-skills-viewer

[English](README.md) | 中文

DeepSeek Harness Web 的自定义技能列表设置页。它在 Settings 面板注册一个“技能”页面，通过既有 `skill.list` wire RPC 获取当前普通 session 的用户可调用技能目录，并以只读列表呈现。

## 安装

使用 Harness 插件命令安装到 Web profile（`dsh` 与 `pnpm` 都需在 `PATH` 中，`dsh plugin` 会把参数转发给 pnpm）：

```sh
dsh plugin --profile web add -w @winterchenhuan/dsh-skills-viewer
dsh web --dump-config     # 确认 skills-viewer 层已生效
dsh web                   # 启动 Web GUI
```

`-w`（`--workspace-root`）标志是必需的：Web profile 目录本身是一个 pnpm workspace 根（`pnpm-workspace.yaml` 内容为 `packages: [.]`），不加该标志时 pnpm 会以 `ERR_PNPM_ADDING_TO_ROOT` 拒绝 `add`。`dsh plugin` 会把参数原样转发给 pnpm，因此该标志会直接透传。

该包声明了 `dsh.bundle`，因此 `dsh plugin add` 会自动插入 `skills-viewer` row，不需要手动修改 profile 的 `cordis.patch.yml`。该包也声明了 `dsh.client`，Web host 会据此加载预构建的浏览器 bundle `lib/client.js`。

从源码 checkout 安装时，请把目录放到 DeepSeek Harness checkout 内的 `custom-plugins/dsh-skills-viewer` 位置——`tsconfig.json` 正是从该位置向上解析 `../../tsconfig.base.client.json`、`../../vendor/cordis` 以及各 `../../packages/*` 项目引用——然后构建并安装本地目录：

```sh
# 在 Harness checkout 根目录执行：
pnpm exec tsc -b custom-plugins/dsh-skills-viewer --pretty false
pnpm exec tsdown --config custom-plugins/dsh-skills-viewer/tsdown.config.ts
pnpm dsh plugin --profile web add -w ./custom-plugins/dsh-skills-viewer
```

（`pnpm dsh` 运行的是该 checkout 自带的 CLI——`apps/cli`；`add` 的相对路径按调用目录解析。）

移除方式：

```sh
dsh plugin --profile web remove @winterchenhuan/dsh-skills-viewer
```

## 组合

这是纯 UI 插件。node half 的 `apply` 为空；browser half 从 `./client` 导出，经 `dsh.client` manifest 发现，并在 `@deepseek-ai/dsh-client-runtime`、`@deepseek-ai/dsh-client-ui-settings`、`@deepseek-ai/dsh-client-locale` 和 `@deepseek-ai/dsh-api-remotes` 可用后注入。它注入 `slots`、`locale` 和 `connection`，再通过 `ctx.slots.inject('settings.section', ...)` 注册一个 `settings.section` 列表项（id `skills`，order `90`），因此不依赖 declaration 顺序。

## 页面行为

页面从 `useSessions` 标准 prop 读取当前 session id 和当前 subagent address。当前导航指向普通 session 时，它调用 `connection.api.skills.list({ sessionId })` 获取目录。技能发现按 session 作用域解析：composition、cwd 和 preset layer 都会影响可见技能，因此页面会在当前 session 变化时重新获取。没有当前 session，或当前导航指向 subagent address 时，页面显示空态且不调用 `skill.list`。如果选中的 session 尚未在 Host 侧连接，页面会短暂自动重试，随后显示重试按钮，而不是直接暴露原始 `session-not-found` 诊断。

每条技能行展示：

- **name** — kebab-case 标识符（等宽字体）
- **模型不可调用**徽章 — 当 `disable-model-invocation: true` 时显示
- **description** — 路由描述
- **whenToUse** — 可选的额外路由说明（斜体）

列表按技能名升序排列。搜索框按 name、description 或 `whenToUse` 过滤（不区分大小写）；当搜索收窄结果时计数行显示 `M of N`，无匹配时显示占位提示。

## 已知限制与后续工作

- **不预览技能正文** — 页面只列出摘要；加载技能正文仍需使用面向模型的 `skill` 工具。未来的内联预览可以调用新的 preview RPC。
- **没有刷新按钮或推送失效** — 页面会在 session 变化时重新获取，但不会手动刷新，也不会订阅 `skills/change`。
