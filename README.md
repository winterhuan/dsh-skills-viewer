# @winterchenhuan/dsh-skills-viewer

English | [中文](README.zh.md)

Custom Skills list settings page for DeepSeek Harness Web. It registers a "Skills" page in the Settings panel, fetches the current ordinary session's user-invocable skill catalog through the existing `skill.list` wire RPC, and renders it as a read-only list.

## Install

Install the bundle into the Web profile with the Harness plugin command. Both `dsh` and `pnpm` must be on `PATH` (`dsh plugin` forwards its arguments to pnpm):

```sh
dsh plugin --profile web add -w @winterchenhuan/dsh-skills-viewer
dsh web --dump-config     # verify the skills-viewer layer is present
dsh web                   # boot the Web GUI
```

The `-w` (`--workspace-root`) flag is required because the Web profile directory is itself a pnpm workspace root (`pnpm-workspace.yaml` with `packages: [.]`); without it pnpm refuses `add` there with `ERR_PNPM_ADDING_TO_ROOT`. `dsh plugin` forwards arguments verbatim to pnpm, so the flag is passed through as-is.

The package declares `dsh.bundle`, so `dsh plugin add` inserts the `skills-viewer` row automatically; do not edit the profile's `cordis.patch.yml` by hand. The package also declares `dsh.client`, which lets the Web host serve its prebuilt browser bundle from `lib/client.js`.

For a source checkout, place the directory at `custom-plugins/dsh-skills-viewer` inside a DeepSeek Harness checkout — `tsconfig.json` resolves `../../tsconfig.base.client.json`, `../../vendor/cordis`, and the `../../packages/*` project references from exactly that location — then build and install it:

```sh
# From the Harness checkout root:
pnpm exec tsc -b custom-plugins/dsh-skills-viewer --pretty false
pnpm exec tsdown --config custom-plugins/dsh-skills-viewer/tsdown.config.ts
pnpm dsh plugin --profile web add -w ./custom-plugins/dsh-skills-viewer
```

(`pnpm dsh` runs the checkout's own CLI from `apps/cli`; relative `add` path specs are anchored to the invoking directory.)

Remove it with:

```sh
dsh plugin --profile web remove @winterchenhuan/dsh-skills-viewer
```

## Composition

This is a pure UI plugin. The node half `apply` is empty; the browser half is exported from `./client`, discovered through the `dsh.client` manifest, and injected after `@deepseek-ai/dsh-client-runtime`, `@deepseek-ai/dsh-client-ui-settings`, `@deepseek-ai/dsh-client-locale`, and `@deepseek-ai/dsh-api-remotes` are available. It injects `slots`, `locale`, and `connection`, then registers one `settings.section` list entry (id `skills`, order `90`) through `ctx.slots.inject('settings.section', ...)` so declaration order does not matter.

## Page behavior

The page reads the current session id and current subagent address from the `useSessions` standard prop. With an ordinary current session, it calls `connection.api.skills.list({ sessionId })` to fetch the catalog. Skill discovery is session-scoped: composition, cwd, and preset layer affect which skills are visible, so the page refetches when the current session changes. With no current session, or while the current navigation points at a subagent address, the page shows the empty state and does not call `skill.list`. A selected session that is still detached host-side is retried briefly and then shows a retry action instead of the raw `session-not-found` diagnostic.

Each skill row displays:

- **name** — kebab-case identifier (monospace)
- **model: off** badge — when `disable-model-invocation: true`
- **description** — routing description
- **whenToUse** — optional extra routing guidance (italic)

The list is sorted alphabetically by skill name. A search box filters rows by name, description, or `whenToUse` (case-insensitive); the count line shows `M of N` when a search narrows the result, and a no-match placeholder when nothing remains.

## Known Limitations and Deferred Work

- **No skill body preview** — the page lists summaries only; loading a skill body requires the model-facing `skill` tool. A future inline preview could call a new preview RPC.
- **No refresh button or push invalidation** — the page refetches on session change but does not manually refresh or subscribe to `skills/change`.
