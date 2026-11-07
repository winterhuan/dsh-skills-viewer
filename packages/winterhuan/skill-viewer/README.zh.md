---
description: "面向 Web 技能面板的会话级只读技能目录 Remote 命名空间：用户可调用技能、元数据与正文，通过分层技能注册表解析。"
kind: "package-reference"
---

# @winterhuan/dsh-skill-viewer

[English](README.md) | 中文

## 概述

本包拥有 Web 技能面板背后的按会话寻址 `skillViewer` Remote 命名空间：一份只读目录，列出某个会话组合可见的用户可调用技能，并按需提供技能正文供面板展示。读取经由分层的 `ctx.skills` 注册表，按查看会话的 cwd 与 preset 作用域解析。该命名空间从不写会话日志——查看是人的展示行为，不是模型可见输入——也从不唤醒冷会话的 Agent。

composer 侧的 `skills` Remote 命名空间继续服务斜杠来源。那份载荷既不含来源/提供方元数据，也不含技能正文，且其契约已冻结，因此面板改读本命名空间。

## 目录

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Failure modes](#failure-modes)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## Use this package

通过[插件市场](https://winterhuan.github.io/dsh-creative/index.json)安装预构建版本，或在 DSH `0.2.2-rc.1` 中安装以下固定 Git 提交：

```sh
dsh plugin --profile market add 'git+https://github.com/winterhuan/dsh-skill-viewer.git#17f32acc7f639b00090e8daa60d575058d574e81&path:/packages/winterhuan/skill-viewer'
```

将 `market` 替换为你已有的 DSH profile 名称。

`dsh plugin add` 安装本 bundle，其 [profile 补丁](cordis.patch.yml)同时挂载本插件与客户端查看器。`skillViewer` 命名空间提供三个方法：`listDetails({ sessionId })` 返回带来源元数据的用户可调用条目，`get({ sessionId, name })` 返回技能正文与本地参考文件列表，`readReference({ sessionId, name, path })` 返回该技能 `references/` 目录中文件的 UTF-8 预览。

插件要求 `sessionQuery`、`agents` 与 `typert`。`agentPresets` 可选；请求优先使用活跃 Agent 的作用域 `skills` 注册表，否则使用宿主注册表。注册表缺失时请求失败，而不是返回空目录。

| 字段 | 默认值 | 含义 |
|---|---|---|
| `maxReferenceEntries` | `1000` | 每次参考文件发现最多检查的目录条目数；未完整列出时报告 `truncated`。 |
| `maxReferenceBytes` | `1048576` | 预览字节上限；超出时报告 `truncated`，不截断 UTF-8 字符。 |

<a id="understand-the-implementation"></a>
## Understand the implementation

职责与信任边界见[Skill Viewer子系统](https://github.com/winterhuan/dsh-creative/blob/upstream-conventions/docs/subsystems/skill-viewer.zh.md)。

每个请求在触碰注册表前先解析观察位置。活跃 Agent 寻址其 preset 作用域的注册表；冷会话解析其记录 preset 的常备作用域；未知或不可用的记录 preset 回退到无作用域的全局注册表。这里从不构造或唤醒 Agent。

`listDetails` 把注册表快照过滤为用户可调用条目，并在提供方观察不完整时报告 `stale: true`，让调用方按「上次可用覆盖」而非权威目录呈现。`get` 校验名称、隐藏对用户调用关闭的技能，并把提供方持有的资源基（目录、URL 或 opaque）拆成 JSON 安全的线上数据随正文返回。

本地参考文件属于提供方声明的绝对资源目录，该目录可以位于 Session 工作区之外。发现只检查 `references/`，跳过隐藏条目与符号链接，返回排序后的路径。读取时重新解析当前胜出的技能，拒绝越界与链接，核对打开文件的身份，只返回有界 UTF-8 文本。浏览器不提供资源根目录。URL、opaque 与相对资源基返回 `references: null`；不存在本地参考目录时返回空列表。

[Creative 决策](https://github.com/winterhuan/dsh-creative/blob/upstream-conventions/.agents/notes/archived/feature/2026-09-03-creative-workbench.md#read-only-skill-viewer)记录查看器命名空间与缓存的取舍。

<a id="failure-modes"></a>
## Failure modes

所有失败都是带类型的 Remote 错误：会话不可检查报 `skillViewer/session-not-found`；该名称没有用户可调用技能报 `skillViewer/unknown-skill`；名称或参考路径非法报 `gateway/bad-request`；参考文件不可读或不是文本时报 `skillViewer/reference-unavailable`；观察缺投影、缺 cwd 或注册表、提供方失败或参考目录发现失败时报 `gateway/internal`。注册表缺失会被报告，绝不静默清空。

<a id="model-experience"></a>
## Model Experience

None, as 命名空间只服务不进入会话日志或模型请求的人类技能读取；面向模型的目录与加载器属于 dsh-tool-skill。

#### KV Cache effect

None；查看器读取不组装任何 provider 请求。

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **命名空间按设计只读**——调用技能仍走 composer 与模型侧；命名空间不提供 watch 或增量同步。
- **正文原样返回**——渲染留在客户端包。
- **rank 与被隐藏的重名不可见**——注册表按名称只暴露胜出条目，因此查看器无法展示重名裁决或分提供方诊断。


<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
