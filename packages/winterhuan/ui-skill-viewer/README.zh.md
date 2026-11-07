---
description: "Web 技能查看器面板：侧栏底部动作打开模态窗口，列出用户可调用技能、来源、提供方元数据与完整说明正文。"
kind: "package-reference"
---

# @winterhuan/dsh-client-ui-skill-viewer

[English](README.md) | 中文

## 概述

本包渲染 Web 技能查看器：一个侧边栏底部入口，点开模态面板，列出当前会话可用的用户可调用技能及其来源与提供方元数据，选中后展示完整 markdown 说明。数据经插件根上下文连接取自 `skillViewer` Remote 命名空间；模型对同一批技能的视图属于 `dsh-client-ui-skill` 的 composer 目录。

## 目录

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## Use this package

[skill 查看器](../skill-viewer/README.zh.md) bundle 连同宿主侧服务一起安装本插件。点击左侧 Sidebar 底部的**技能**即可打开。有可寻址会话时，面板展示目录：列表上方的搜索输入、每技能一行的列表（技能对模型隐藏时带 `user-only` 徽标）、以及目录为上次可用覆盖时的 stale 提示条。空白视图或可续接的子代理视图则渲染无作用域的空状态，因为 RPC 要求已挂接的会话。

搜索匹配技能名称、描述、适用场景、来源和提供方，名称匹配优先。目录显示匹配数量，并提供清除与刷新。刷新重新读取当前目录和正文，重新打开则使用缓存；两者都会保留仍然可用的已选技能。进入其他会话时选择第一个匹配项；普通会话列表更新保留当前选择及参考文件读取。

弹框使用视口可用高度。宽屏并排显示目录和阅读区，窄屏通过返回按钮切换。Markdown 技能说明和参考文件默认格式化预览，“原文”显示准确文本，其他文本文件直接显示原文。技能信息按需展开；可先过滤参考路径，再选择文件，“返回技能说明”恢复正文。阅读区在标题下方单层滚动，切换技能或文件后从顶部开始阅读，关闭后键盘焦点回到侧栏入口。全部文案提供中英文。

<a id="understand-the-implementation"></a>
## Understand the implementation

职责与信任边界见[Skill Viewer子系统](https://github.com/winterhuan/dsh-creative/blob/upstream-conventions/docs/subsystems/skill-viewer.zh.md)。

控制器按会话缓存并单飞请求：一次落定的 `listDetails` 读取在重开时本地重放，正文按会话与名称缓存。preset 切换丢弃该会话的条目（目录属于组合），连接重置清空全部，面板打开时会话切换会选择新会话的已缓存目录，或获取该会话的目录。每次落定先核对当前可寻址会话，因此飞行中的切换绝不会画出旧数据；失败的请求绝不污染缓存键，下次打开自然重试。

参考文件每次选中时重新读取。离开参考文件、切换技能或 Session、关闭查看器或释放组件时取消该读取，迟到的响应不能替换当前选择。列表和预览达到配置上限时明确提示截断；二进制和不可用资源显示读取错误。

各项注册随插件 fiber 生命周期：字典、底部槽位、Remote 事件订阅与控制器的会话订阅在卸载时一并撤除，重载可干净再注册。

[Creative 决策](https://github.com/winterhuan/dsh-creative/blob/upstream-conventions/.agents/notes/archived/feature/2026-09-03-creative-workbench.md#read-only-skill-viewer)记录查看器命名空间与缓存的取舍。

<a id="model-experience"></a>
## Model Experience

None, as 面板只为人类渲染查看器命名空间的读取，不触碰 prompt、消息、schema、流或工具结果。

#### KV Cache effect

None；本包从不组装或发送 provider 请求。

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **查看器是只读展示**——从不调用技能，也从不改动会话。
- **搜索只过滤目录元数据**——不扫描说明正文。
- **没有 watch**——重新打开会保留已完成的缓存；使用刷新读取磁盘变更。


<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
