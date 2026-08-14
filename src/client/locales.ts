/**
 * Skills settings page copy.
 */

const en = {
  /** Sidebar settings nav label. */
  nav: 'Skills',
  /** Page heading. */
  heading: 'Skills',
  /** Page description. */
  description: 'Skills are reusable instruction packages discovered from local filesystem roots. The model loads them on demand through the skill tool.',
  /** Loading placeholder. */
  loading: 'Loading skills...',
  /** Empty state. */
  empty: 'No skills discovered.',
  /** Count suffix. */
  countSuffix: ' skill(s) discovered',
  /** Model-invocable-off badge. */
  modelOff: 'model: off',
  /** Retryable state while the selected session is detached host-side. */
  notAttached: 'This session is not attached yet. Open its conversation, then retry.',
  /** Retry button label. */
  retry: 'Retry',
} as const

/** Chinese copy. */
const zh = {
  nav: '技能',
  heading: '技能',
  description: '技能是从本地文件系统根目录发现的可复用指令包。模型在需要时通过 skill 工具按需加载。',
  loading: '正在加载技能...',
  empty: '未发现技能。',
  countSuffix: ' 个技能已发现',
  modelOff: '模型不可调用',
  notAttached: '该 session 尚未连接。请先打开它的会话，然后重试。',
  retry: '重试',
} as const

/** Dictionary keys of this plugin. */
export type SkillsKey = typeof en

/** Locale namespace owned by this plugin. */
export const NS = 'settings.skills'

export { en, zh }
