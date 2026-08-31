import { config } from '@rctf/config'
import { instancerProviders } from '../instancer'
import type { InstanceSummary, InstancerProvider } from '../instancer/base'
import { resolveInstancerConfigs } from '../instancer/resolve'
import { loadProvider } from './load'

const resolvedInstancers = resolveInstancerConfigs(config)
export const instancers: Record<string, InstancerProvider> = Object.fromEntries(
  Object.entries(resolvedInstancers.configs).map(([name, providerConfig]) => [
    name,
    loadProvider(instancerProviders, providerConfig)!,
  ])
)
export const defaultInstancerName = resolvedInstancers.defaultName
export const instancerEnabled = Object.keys(instancers).length > 0

// Every active instance across providers that can enumerate them, for admin
// monitoring. Providers without listInstances contribute nothing; a failing
// provider is skipped rather than failing the whole request.
export const getActiveInstances = async (): Promise<InstanceSummary[]> => {
  const perProvider = await Promise.all(
    Object.values(instancers).map(async provider => {
      if (!provider.listInstances) {
        return []
      }
      try {
        return await provider.listInstances()
      } catch {
        return []
      }
    })
  )
  return perProvider.flat()
}
