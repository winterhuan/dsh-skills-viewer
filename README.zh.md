# @winterchenhuan/dsh-skills-viewer

[English](README.md) | 中文

DeepSeek Harness Web 的自定义技能列表设置页。它在 Settings 面板注册一个“技能”页面，通过既有 `skill.list` wire RPC 获取当前普通 session 的用户可调用技能目录，并以只读列表呈现。

## 安装

使用 Harness 插件命令安装到 Web profile：

```sh
dsh plugin --profile web add @winterchenhuan/dsh-skills-viewer
dsh --profile web --dump-config
dsh --profile web web
```

该包声明了 `dsh.bundle`，因此 `dsh plugin add` 会自动插入 `skills-viewer` row，不需要手动修改 profile 的 `cordis.patch.yml`。该包也声明了 `dsh.client`，Web host 会据此加载预构建的浏览器 bundle `lib/client.js`。

从源码 checkout 安装时，先构建再安装本地目录：

```sh
# 在包含 custom-plugins/dsh-skills-viewer 的 DeepSeek Harness checkout 根目录执行：
pnpm exec tsc -b custom-plugins/dsh-skills-viewer --pretty false
pnpm exec tsdown --config custom-plugins/dsh-skills-viewer/tsdown.config.ts
pnpm dsh plugin --profile web add ./custom-plugins/dsh-skills-viewer
```

移除方式：

```sh
dsh plugin --profile web remove @winterchenhuan/dsh-skills-viewer
```

## 组合

这是纯 UI 插件。node half 的 `apply` 为空；browser half 从 `./client` 导出，经 `dsh.client` manifest 发现，并在 `@deepseek-ai/dsh-client-runtime`、`@deepseek-ai/dsh-client-ui-settings`、`@deepseek-ai/dsh-client-locale` 和 `@deepseek-ai/dsh-api-remotes` 可用后注入。它注入 `slots`、`locale` 和 `connection`，再通过 `ctx.slots.inject('settings.section', ...)` 注册一个 `settings.section` 列表项（id `skills`，order `90`），因此不依赖 declaration 顺序。

## 页面行为

页面从 `useSessions` 标准 prop 读取当前 session id 和当前 subagent address。当前导航指向普通 session 时，它调用 `connection.api.skills.list({ sessionId })` 获取目录。技能发现按 session 作用域解析：composition、cwd 和 preset layer 都会影响可见技能，因此页面会在当前 session 变化时重新获取。没有当前 session，或当前导航指向 subagent address 时，页面显示空态且不调用 `skill.list`。

每条技能行展示：

- **name** — kebab-case 标识符（等宽字体）
- **模型不可调用**徽章 — 当 `disable-model-invocation: true` 时显示
- **description** — 路由描述
- **whenToUse** — 可选的额外路由说明（斜体）

## Model Experience

None, as this package only renders a browser settings UI; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **不预览技能正文** — 页面只列出摘要；加载技能正文仍需使用面向模型的 `skill` 工具。未来的内联预览可以调用新的 preview RPC。
- **没有刷新按钮或推送失效** — 页面会在 session 变化时重新获取，但不会手动刷新，也不会订阅 `skills/change`。
