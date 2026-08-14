# @winterchenhuan/dsh-skills-viewer

English | [中文](README.zh.md)

Custom Skills list settings page for DeepSeek Harness Web. It registers a "Skills" page in the Settings panel, fetches the current ordinary session's user-invocable skill catalog through the existing `skill.list` wire RPC, and renders it as a read-only list.

## Install

This source tree is intended to be developed beside a DeepSeek Harness checkout until the Harness client packages are published with their complete dependency closure. From this directory inside the checkout, use the `*:harness` scripts for local validation.

Add the package to the Web profile's Node resolution path, then add one client plugin row to the Web composition:

```yaml
plugins:
  - id: skills-viewer
    name: '@winterchenhuan/dsh-skills-viewer'
```

See `cordis.patch.example.yml` for the same row as a copyable patch file.

The package is a browser UI plugin with an empty node half. Its `dsh.client` manifest declares the client dependencies the Harness browser must load before the `./client` bundle.

## Composition

This is a pure UI plugin. The node half `apply` is empty; the browser half is exported from `./client`, discovered through the `dsh.client` manifest, and injected after `@deepseek-ai/dsh-client-runtime`, `@deepseek-ai/dsh-client-ui-settings`, `@deepseek-ai/dsh-client-locale`, and `@deepseek-ai/dsh-api-remotes` are available. It injects `slots`, `locale`, and `connection`, then registers one `settings.section` list entry (id `skills`, order `90`) through `ctx.slots.inject('settings.section', ...)` so declaration order does not matter.

## Page behavior

The page reads the current session id and current subagent address from the `useSessions` standard prop. With an ordinary current session, it calls `connection.api.skills.list({ sessionId })` to fetch the catalog. Skill discovery is session-scoped: composition, cwd, and preset layer affect which skills are visible, so the page refetches when the current session changes. With no current session, or while the current navigation points at a subagent address, the page shows the empty state and does not call `skill.list`.

Each skill row displays:

- **name** — kebab-case identifier (monospace)
- **model: off** badge — when `disable-model-invocation: true`
- **description** — routing description
- **whenToUse** — optional extra routing guidance (italic)

## Model Experience

None, as this package only renders a browser settings UI; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **No skill body preview** — the page lists summaries only; loading a skill body requires the model-facing `skill` tool. A future inline preview could call a new preview RPC.
- **No refresh button or push invalidation** — the page refetches on session change but does not manually refresh or subscribe to `skills/change`.
