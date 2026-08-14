# @winterchenhuan/dsh-skills-viewer

English | [中文](README.zh.md)

Custom Skills list settings page for DeepSeek Harness Web. It registers a "Skills" page in the Settings panel, fetches the current ordinary session's user-invocable skill catalog through the existing `skill.list` wire RPC, and renders it as a read-only list.

## Install

Install the bundle into the Web profile with the Harness plugin command:

```sh
dsh plugin --profile web add @winterchenhuan/dsh-skills-viewer
dsh --profile web --dump-config
dsh --profile web web
```

The package declares `dsh.bundle`, so `dsh plugin add` inserts the `skills-viewer` row automatically; do not edit the profile's `cordis.patch.yml` by hand. The package also declares `dsh.client`, which lets the Web host serve its prebuilt browser bundle from `lib/client.js`.

For a source checkout, build first and then install the local directory:

```sh
# From the DeepSeek Harness checkout that contains this directory at
# custom-plugins/dsh-skills-viewer:
pnpm exec tsc -b custom-plugins/dsh-skills-viewer --pretty false
pnpm exec tsdown --config custom-plugins/dsh-skills-viewer/tsdown.config.ts
pnpm dsh plugin --profile web add ./custom-plugins/dsh-skills-viewer
```

Remove it with:

```sh
dsh plugin --profile web remove @winterchenhuan/dsh-skills-viewer
```

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
