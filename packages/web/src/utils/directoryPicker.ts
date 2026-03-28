import { open } from '@tauri-apps/plugin-dialog'

export async function pickDirectory(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: 'Select Skills Directory',
  })

  const selectedPath = Array.isArray(selected) ? selected[0] : selected
  if (typeof selectedPath !== 'string' || !selectedPath.trim()) {
    return null
  }

  return selectedPath
}
