import { isTauri } from '@tauri-apps/api/core'

let apiImpl: typeof import('./tauri').api | typeof import('./http').api

export async function initApi() {
  if (await isTauri()) {
    const module = await import('./tauri')
    apiImpl = module.api
  } else {
    const module = await import('./http')
    apiImpl = module.api
  }
}

export const api = new Proxy({} as typeof import('./tauri').api, {
  get(_target, prop) {
    if (!apiImpl) {
      throw new Error('API not initialized. Call initApi() first.')
    }
    return apiImpl[prop as keyof typeof apiImpl]
  },
})
