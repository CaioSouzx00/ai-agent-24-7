import { create } from 'zustand'

export interface AuthState {
  apiKey: string
  operatorName: string
  theme: 'dark' | 'light' | 'system'
  setApiKey: (key: string) => void
  setOperatorName: (name: string) => void
  setTheme: (theme: 'dark' | 'light' | 'system') => void
}

const STORAGE_KEY_API = 'ai_agent_api_key'
const STORAGE_KEY_OP = 'ai_agent_operator_name'
const STORAGE_KEY_THEME = 'ai_agent_theme'

export const useAuthStore = create<AuthState>((set) => ({
  apiKey: typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_API) || '' : '',
  operatorName: typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_OP) || 'human' : 'human',
  theme: (typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEY_THEME) as 'dark' | 'light' | 'system') || 'dark' : 'dark'),
  setApiKey: (key: string) => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY_API, key)
    set({ apiKey: key })
  },
  setOperatorName: (name: string) => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY_OP, name)
    set({ operatorName: name })
  },
  setTheme: (theme: 'dark' | 'light' | 'system') => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY_THEME, theme)
    set({ theme })
  },
}))
