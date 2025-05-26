import { createStore } from "./createStore"
import type { SystemHealth } from "../repositories/HealthRepository"

export interface HealthState {
  systemHealth: SystemHealth | null
  isLoading: boolean
  error: string | null
  lastUpdated: string | null // Changed from Date to string
  autoRefresh: boolean
  refreshInterval: number
}

const initialState: HealthState = {
  systemHealth: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
  autoRefresh: true,
  refreshInterval: 10000, // 10 seconds
}

export const healthStore = createStore(initialState)

// Health store actions with better error handling
export const healthActions = {
  setLoading: (isLoading: boolean) => {
    try {
      healthStore.setState((state) => ({
        ...state,
        isLoading: Boolean(isLoading),
      }))
    } catch (error) {
      console.error("Error setting loading state:", error)
    }
  },

  setSystemHealth: (systemHealth: SystemHealth) => {
    try {
      healthStore.setState((state) => ({
        ...state,
        systemHealth: systemHealth ? { ...systemHealth } : null,
        lastUpdated: new Date().toISOString(),
        error: null,
        isLoading: false,
      }))
    } catch (error) {
      console.error("Error setting system health:", error)
    }
  },

  setError: (error: string) => {
    try {
      healthStore.setState((state) => ({
        ...state,
        error: String(error || ""),
        isLoading: false,
      }))
    } catch (err) {
      console.error("Error setting error state:", err)
    }
  },

  toggleAutoRefresh: () => {
    try {
      healthStore.setState((state) => ({
        ...state,
        autoRefresh: !state.autoRefresh,
      }))
    } catch (error) {
      console.error("Error toggling auto refresh:", error)
    }
  },

  setRefreshInterval: (refreshInterval: number) => {
    try {
      const interval = Math.max(1000, Number(refreshInterval) || 10000) // Min 1 second
      healthStore.setState((state) => ({
        ...state,
        refreshInterval: interval,
      }))
    } catch (error) {
      console.error("Error setting refresh interval:", error)
    }
  },

  clearError: () => {
    try {
      healthStore.setState((state) => ({
        ...state,
        error: null,
      }))
    } catch (error) {
      console.error("Error clearing error:", error)
    }
  },

  reset: () => {
    try {
      healthStore.setState(() => ({ ...initialState }))
    } catch (error) {
      console.error("Error resetting health store:", error)
    }
  },
}
