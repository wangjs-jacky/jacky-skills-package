import { create } from 'zustand'
import type { SkillInfo, EnvironmentInfo, ConfigInfo } from '../api/client'

interface AppState {
  // Skills
  skills: SkillInfo[]
  setSkills: (skills: SkillInfo[]) => void

  // Environments
  environments: EnvironmentInfo[]
  setEnvironments: (envs: EnvironmentInfo[]) => void

  // Config
  config: ConfigInfo
  setConfig: (config: ConfigInfo) => void

  // UI State
  isLoading: boolean
  setIsLoading: (loading: boolean) => void

  // Toast
  toast: { message: string; type: 'success' | 'error' } | null
  showToast: (message: string, type: 'success' | 'error') => void
  hideToast: () => void
}

export const useStore = create<AppState>((set) => ({
  // Skills
  skills: [],
  setSkills: (skills) => set({ skills }),

  // Environments
  environments: [],
  setEnvironments: (environments) => set({ environments }),

  // Config
  config: {},
  setConfig: (config) => set({ config }),

  // UI State
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),

  // Toast
  toast: null,
  showToast: (message, type) => set({ toast: { message, type } }),
  hideToast: () => set({ toast: null }),
}))
