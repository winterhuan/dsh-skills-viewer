/** Skills section registration: slot declaration injection, locale labels, and teardown. */
import { Context } from '@deepseek-ai/cordis'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resolveSlotLabel } from '@deepseek-ai/dsh-client-ui-slots'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
/**
 * Browser-language pin for specs that assert localized copy. Semantics
 * match the harness's `dsh-client-test-runtime` helper (whose published
 * bundle imports browser-graph sources not shipped on npm), kept local so
 * the spec tree stays standalone-installable.
 */
function usePinnedBrowserLanguages(primary: string): void {
  beforeEach(() => {
    Object.defineProperty(navigator, 'languages', { value: [primary], configurable: true })
    Object.defineProperty(navigator, 'language', { value: primary, configurable: true })
  })
  afterEach(() => {
    const own = navigator as unknown as Record<string, unknown>
    delete own.languages
    delete own.language
  })
}
import { apply, inject } from '../src/client/index.ts'
import { SkillsSection } from '../src/client/SkillsSection.tsx'
import type { SkillsSectionInjected } from '../src/client/SkillsSection.tsx'

// The service reads its initial locale from the browser; these specs assert
// the shipped Chinese copy, so they state the browser they assume.
usePinnedBrowserLanguages('zh-CN')

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  ctx.provide('locale', locale)
  const skills = { list: () => Promise.resolve({ rpcId: 'skills' as never, result: { ok: true as const, value: { skills: [] } } }) }
  ctx.provide('connection', { api: { skills } } as never)
  return { ctx, slots: ctx.get('slots') as SlotRegistry, locale, skills }
}

function declare(slots: SlotRegistry): () => void {
  return slots.register({
    name: 'root',
    children: { 'settings.section': { kind: 'list', scope: 'root' } },
  } as never, () => null)
}

describe('ui-skills-viewer apply', () => {
  it('declares the services it uses', () => {
    expect(inject).toEqual(['slots', 'locale', 'connection'])
  })

  it('registers the Skills settings section for declarations before or after apply', async () => {
    const before = await bench()
    declare(before.slots)
    await before.ctx.plugin({ inject: [...inject], apply }).await()
    const entry = before.slots.entries('settings.section')[0]!
    expect(entry.component).toBe(SkillsSection)
    expect(entry.options).toMatchObject({ id: 'skills', order: 90 })
    expect(resolveSlotLabel(entry.options.label)).toBe('技能')
    const injected = (entry.inject as unknown as () => SkillsSectionInjected)()
    expect(injected.api.skills).toBe(before.skills)
    expect(injected.t('nav')).toBe('技能')

    const after = await bench()
    await after.ctx.plugin({ inject: [...inject], apply }).await()
    expect(after.slots.entries('settings.section')).toHaveLength(0)
    declare(after.slots)
    await Promise.resolve()
    expect(after.slots.entries('settings.section')[0]!.component).toBe(SkillsSection)
    expect(after.slots.entries('settings.section')).toHaveLength(1)
  })

  it('the label thunk follows the active locale without re-registration', async () => {
    const b = await bench()
    declare(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    b.locale.setLocale('en')
    expect(resolveSlotLabel(b.slots.entries('settings.section')[0]!.options.label)).toBe('Skills')
    const injected = b.slots.entries('settings.section')[0]!.inject as unknown as () => SkillsSectionInjected
    expect(injected().t('heading')).toBe('Skills')
    b.locale.setLocale('zh')
    expect(resolveSlotLabel(b.slots.entries('settings.section')[0]!.options.label)).toBe('技能')
  })

  it('re-registers after an HMR collapse re-declares the slot', async () => {
    const b = await bench()
    const redeclare = declare(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    expect(b.slots.entries('settings.section')).toHaveLength(1)

    redeclare()
    expect(b.slots.entries('settings.section')).toHaveLength(0)
    declare(b.slots)
    await Promise.resolve()

    expect(b.slots.entries('settings.section')[0]!.component).toBe(SkillsSection)
  })

  it('registers dictionaries and disposes every contribution with the fiber', async () => {
    const b = await bench()
    declare(b.slots)
    const fiber = b.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    const t = b.locale.bind('settings.skills') as (key: 'nav') => string
    expect(t('nav')).toBe('技能')

    await fiber.dispose()

    expect(b.slots.entries('settings.section')).toHaveLength(0)
    expect(() => b.locale.register('settings.skills', 'zh', {})).not.toThrow()
    expect(() => b.locale.register('settings.skills', 'en', {})).not.toThrow()
  })
})
