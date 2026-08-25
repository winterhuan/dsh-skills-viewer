import { clientBundle } from './client-bundle.ts'

const ns = clientBundle('@deepseek-ai/dsh-client-locale/client')
export const LocaleRuntime = ns.LocaleRuntime as typeof import('@deepseek-ai/dsh-client-locale/client').LocaleRuntime
