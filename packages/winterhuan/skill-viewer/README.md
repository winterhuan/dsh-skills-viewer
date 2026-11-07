---
description: "Session-addressed read-only skill catalog Remote namespace for the Web skill panel: user-invocable skills with metadata and bodies, resolved through the layered skills registry."
kind: "package-reference"
---

# @winterhuan/dsh-skill-viewer

English | [中文](README.zh.md)

## Summary

This package owns the Session-addressed `skillViewer` Remote namespace behind the Web skill panel: a read-only catalog of the user-invocable skills one Session's composition sees, plus on-demand skill bodies for viewer presentation. Reads go through the layered `ctx.skills` registry for the viewing Session's cwd and preset scope. The namespace never writes the session log — viewer reads are human presentation, not model-visible input — and never resumes a cold Agent.

The composer's `skills` Remote namespace keeps serving the slash source. That payload carries neither source/provider metadata nor skill bodies and its contract is frozen, so the panel reads this namespace instead.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Failure modes](#failure-modes)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## Use this package

Install the prebuilt release through the [plugin market](https://winterhuan.github.io/dsh-creative/index.json), or use this pinned Git source with DSH `0.2.2-rc.1`:

```sh
dsh plugin --profile market add 'git+https://github.com/winterhuan/dsh-skill-viewer.git#17f32acc7f639b00090e8daa60d575058d574e81&path:/packages/winterhuan/skill-viewer'
```

Replace `market` with the name of your existing DSH profile.

`dsh plugin add` installs this bundle; its [profile patch](cordis.patch.yml) mounts this plugin alongside its client viewer. The `skillViewer` namespace provides `listDetails({ sessionId })` for user-invocable entries with source metadata, `get({ sessionId, name })` for a skill body and local reference listing, and `readReference({ sessionId, name, path })` for a UTF-8 file preview under that skill's `references/` directory.

The plugin requires `sessionQuery`, `agents`, and `typert`. `agentPresets` is optional; requests use the live Agent's scoped `skills` registry when available, otherwise the host registry. An absent registry fails the request instead of serving an empty catalog.

| Field | Default | Meaning |
|---|---|---|
| `maxReferenceEntries` | `1000` | Maximum directory entries examined per reference listing; incomplete listings report `truncated`. |
| `maxReferenceBytes` | `1048576` | Maximum preview bytes; larger files report `truncated`, without cutting a UTF-8 character. |

<a id="understand-the-implementation"></a>
## Understand the implementation

Ownership and trust boundaries: [Skill Viewer subsystem](https://github.com/winterhuan/dsh-creative/blob/upstream-conventions/docs/subsystems/skill-viewer.md).

Each request resolves a view position before touching a registry. A live Agent addresses its own preset-scoped registry; a cold Session resolves its recorded preset's standing scope; an unknown or unusable recorded preset falls back to the global registry with no scope. Nothing here constructs or resumes an Agent.

`listDetails` filters the registry snapshot to user-invocable summaries and reports `stale: true` when a provider observation was incomplete, so callers can present last-good coverage rather than an authoritative catalog. `get` validates the name, hides skills disabled for user invocation, and detaches the provider-owned resource base (directory, URL, or opaque) into JSON-safe wire data alongside the body.

Local references belong to the provider's absolute resource directory, which may be outside the Session workspace. Discovery examines only `references/`, omits hidden entries and symbolic links, and returns sorted paths. Reads resolve the current winning skill again, reject traversal and links, verify the opened file's identity, and return only bounded UTF-8 text. The provider's directory is never supplied by the browser. URL, opaque and relative resource bases return `references: null`; a missing local references directory returns an empty listing.

The [Creative decision](https://github.com/winterhuan/dsh-creative/blob/upstream-conventions/.agents/notes/archived/feature/2026-09-03-creative-workbench.md#read-only-skill-viewer) records the viewer namespace and caching trade-offs.

<a id="failure-modes"></a>
## Failure modes

Every failure is a typed Remote error: `skillViewer/session-not-found` when the Session cannot be inspected, `skillViewer/unknown-skill` when no user-invocable skill with that name is available, `gateway/bad-request` for a malformed name or reference path, `skillViewer/reference-unavailable` for an unreadable or non-text reference, and `gateway/internal` for an unprojected observation, missing cwd or registry, provider failure, or failed reference discovery. Registry absence is reported, never silently emptied.

<a id="model-experience"></a>
## Model Experience

None, as the namespace serves human-only skill reads that never enter the session log or a model request; dsh-tool-skill owns the model-facing catalog and loader.

#### KV Cache effect

None; viewer reads assemble no provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **The namespace is read-only** — invoking a skill stays on the composer and the model surface; the namespace offers no watch or incremental sync.
- **Bodies are served verbatim** — rendering stays in the client package.
- **Ranks and shadowed names stay hidden** — the registry exposes only the winning summary per name, so the viewer cannot show duplicate resolution or per-provider diagnostics.


<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
