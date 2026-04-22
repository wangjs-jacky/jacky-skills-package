import { create } from 'zustand'
import type { SkillInfo, EnvironmentInfo, ConfigInfo, ProfileInfo, ActiveProfileRef } from '../api/client'
import { profilesApi } from '../api/client'

interface AppState {
  // Skills
  skills: SkillInfo[]
  setSkills: (skills: SkillInfo[]) => void
  updateSkillEnvironments: (skillName: string, environments: string[]) => void

  // Environments
  environments: EnvironmentInfo[]
  setEnvironments: (envs: EnvironmentInfo[]) => void

  // Config
  config: ConfigInfo
  setConfig: (config: ConfigInfo) => void

  // Profiles
  profiles: ProfileInfo[]
  setProfiles: (profiles: ProfileInfo[]) => void
  activeProfile: ActiveProfileRef | null
  setActiveProfile: (ref: ActiveProfileRef | null) => void
  loadProfiles: () => Promise<void>

  // UI State
  isLoading: boolean
  setIsLoading: (loading: boolean) => void

  // Toast
  toast: { message: string; type: 'success' | 'error' | 'warning'; action?: { label: string; onClick: () => void } } | null
  showToast: (message: string, type: 'success' | 'error' | 'warning', options?: { action?: { label: string; onClick: () => void } }) => void
  hideToast: () => void
}

export const useStore = create<AppState>((set) => ({
  // Skills
  skills: [],
  setSkills: (skills) => set({ skills }),
  updateSkillEnvironments: (skillName, environments) =>
    set((state) => ({
      skills: state.skills.map((skill) =>
        skill.name === skillName
          ? { ...skill, installedEnvironments: environments }
          : skill
      ),
    })),

  // Environments
  environments: [],
  setEnvironments: (environments) => set({ environments }),

  // Config
  config: {},
  setConfig: (config) => set({ config }),

  // Profiles
  profiles: [],
  setProfiles: (profiles) => set({ profiles }),
  activeProfile: null,
  setActiveProfile: (activeProfile) => set({ activeProfile }),
  loadProfiles: async () => {
    const [profilesRes, activeRes] = await Promise.all([
      profilesApi.list(),
      profilesApi.getActive(),
    ])
    if (profilesRes.success) {
      set({ profiles: profilesRes.data })
    }
    if (activeRes.success) {
      set({ activeProfile: activeRes.data })
    }
  },

  // UI State
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),

  // Toast
  toast: null,
  showToast: (message, type, options) => set({ toast: { message, type, action: options?.action } }),
  hideToast: () => set({ toast: null }),
}))
