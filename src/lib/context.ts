import { createContext, useContext } from 'react'
import type { UserProfile } from './constants'

interface AppContextValue {
  user: UserProfile | null
  setUser: (user: UserProfile | null) => void
}

export const AppContext = createContext<AppContextValue>({
  user: null,
  setUser: () => {},
})

export function useApp() {
  return useContext(AppContext)
}
