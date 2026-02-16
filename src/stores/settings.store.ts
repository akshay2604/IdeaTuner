import { create } from 'zustand'
import * as commands from '@/api/commands'
import { validateApiKey } from '@/api/ai-client'

interface SettingsState {
  apiKeySet: boolean
  apiKeyDisplay: string | null
  rawApiKey: string | null
  darkMode: boolean
  isLoading: boolean

  // Actions
  checkApiKey: () => Promise<void>
  setApiKey: (key: string) => Promise<boolean>
  removeApiKey: () => Promise<void>
  toggleDarkMode: () => void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  apiKeySet: false,
  apiKeyDisplay: null,
  rawApiKey: null,
  darkMode: false,
  isLoading: false,

  checkApiKey: async () => {
    try {
      const display = await commands.getApiKey()
      const raw = display ? await commands.getApiKeyRaw() : null
      set({ apiKeySet: !!display, apiKeyDisplay: display, rawApiKey: raw })
    } catch {
      set({ apiKeySet: false, apiKeyDisplay: null, rawApiKey: null })
    }
  },

  setApiKey: async (key: string) => {
    set({ isLoading: true })
    try {
      const valid = await validateApiKey(key)
      if (valid) {
        await commands.setApiKey(key)
        const display = await commands.getApiKey()
        set({ apiKeySet: true, apiKeyDisplay: display, rawApiKey: key, isLoading: false })
        return true
      }
      set({ isLoading: false })
      return false
    } catch {
      set({ isLoading: false })
      return false
    }
  },

  removeApiKey: async () => {
    await commands.removeApiKey()
    set({ apiKeySet: false, apiKeyDisplay: null, rawApiKey: null })
  },

  toggleDarkMode: () => {
    const { darkMode } = get()
    const newMode = !darkMode
    set({ darkMode: newMode })
    if (newMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
}))
