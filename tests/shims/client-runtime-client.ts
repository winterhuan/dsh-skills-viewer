import { clientBundle } from './client-bundle.ts'

const ns = clientBundle('@deepseek-ai/dsh-client-runtime/client')
export const SlotRegistry = ns.SlotRegistry as typeof import('@deepseek-ai/dsh-client-runtime/client').SlotRegistry
export const ClientContext = ns.ClientContext as unknown as import('@deepseek-ai/dsh-client-runtime/client').ClientContext
