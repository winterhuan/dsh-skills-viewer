---
description: "Web skill viewer panel: a sidebar-foot action opening a modal listing user-invocable skills with source, provider metadata, and full instruction bodies."
kind: "package-reference"
---

# @winterhuan/dsh-client-ui-skill-viewer

English | [中文](README.zh.md)

## Summary

This package renders the Web skill viewer: a sidebar-foot action that opens a modal listing the user-invocable skills of the current session, each with its source and provider metadata, and serving the full markdown instructions on selection. Data comes from the `skillViewer` Remote namespace over the plugin's root-context connection; the model's own view of the same skills belongs to `dsh-client-ui-skill`'s composer catalog.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## Use this package

The [skill viewer](https://github.com/winterhuan/dsh-skill-viewer/blob/main/packages/winterhuan/skill-viewer/README.md) bundle installs this plugin together with the host-side service. Choose **Skills** at the bottom of the left Sidebar. With an addressable session the panel shows the catalog: a search input over the list, one row per skill carrying a `user-only` badge when the skill is hidden from the model, and a stale banner when the catalog is last-good coverage. A blank or continuable-subagent view renders the unscoped empty state instead, because the RPC requires an attached session.

Search matches skill names, descriptions, usage guidance, sources, and providers, with name matches ranked first. The catalog shows the matching count and offers Clear and Refresh. Refresh reads the current catalog and body again; reopening uses the cache. Both retain the selected skill when it remains available. Entering a different session selects the first match. Ordinary session-list updates preserve the current selection and reference read.

The modal uses the available viewport height. Wide screens keep the catalog beside the reader; narrow screens use Back to switch between them. Markdown instructions and references open as formatted previews, with Source showing the exact text; other text files use Source. Skill information expands on demand. Filter reference paths before choosing a file, and use Back to skill to return to the instructions. The reader has one scrollable area beneath its title. Selecting another skill or file starts at the top, and closing returns keyboard focus to the sidebar action. All copy is available in Chinese and English.

<a id="understand-the-implementation"></a>
## Understand the implementation

Ownership and trust boundaries: [Skill Viewer subsystem](https://github.com/winterhuan/dsh-creative/blob/upstream-conventions/docs/subsystems/skill-viewer.md).

The controller caches per session with single-flight fetches: one settled `listDetails` read replays locally on reopen, and bodies cache per session and name. A preset switch drops that session's entries (the catalog belongs to the composition), a connection reset drops everything, and a session switch under an open panel selects the new session's cached or fetched catalog. Settlements check the currently addressable session first, so a mid-flight switch never paints stale data; a failed fetch never poisons its cache key, so the next open retries.

Reference previews are read afresh when selected. Leaving a reference, changing the skill or Session, closing the viewer, or disposing it cancels that read. Late responses cannot replace the current selection. The list and preview show explicit notices when a configured limit truncates them; binary and unavailable resources report read errors.

Registrations ride the plugin fiber: dictionaries, the foot slot, the Remote event subscriptions, and the controller's session subscription all withdraw on disposal, so a reload re-registers cleanly.

The [Creative decision](https://github.com/winterhuan/dsh-creative/blob/upstream-conventions/.agents/notes/archived/feature/2026-09-03-creative-workbench.md#read-only-skill-viewer) records the viewer namespace and caching trade-offs.

<a id="model-experience"></a>
## Model Experience

None, as the panel renders viewer-namespace reads for a human and touches no prompt, message, schema, stream, or tool result.

#### KV Cache effect

None; the package never assembles or sends provider requests.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **The viewer is read-only presentation** — it never invokes a skill and never mutates a session.
- **Search filters catalog metadata only** — it does not scan instruction bodies.
- **There is no watch** — reopening preserves settled caches; use Refresh to read on-disk changes.


<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
