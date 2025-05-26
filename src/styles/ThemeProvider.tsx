"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

type ThemeMode = "light" | "dark" | "system"
type ThemeVariant = "default" | "android"

interface ThemeContextType {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  variant: ThemeVariant
  setVariant: (variant: ThemeVariant) => void
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "system",
  setMode: () => {},
  variant: "default",
  setVariant: () => {},
  isDark: false,
  toggleTheme: () => {},
})

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

const STORAGE_KEY = "enterprise-file-explorer-theme"
const VARIANT_KEY = "enterprise-file-explorer-variant"

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>("system")
  const [variant, setVariant] = useState<ThemeVariant>("default")
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Initialize theme from localStorage
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem(STORAGE_KEY) as ThemeMode
      const savedVariant = localStorage.getItem(VARIANT_KEY) as ThemeVariant

      if (savedMode && ["light", "dark", "system"].includes(savedMode)) {
        setMode(savedMode)
      }

      if (savedVariant && ["default", "android"].includes(savedVariant)) {
        setVariant(savedVariant)
      }
    } catch (error) {
      console.warn("Failed to load theme from localStorage:", error)
    }

    setMounted(true)
  }, [])

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    const html = document.querySelector("html")
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    // Determine if dark mode should be applied
    const shouldApplyDark = mode === "dark" || (mode === "system" && systemDark)
    setIsDark(shouldApplyDark)

    // Remove all theme classes from both html and root
    root.classList.remove("dark", "android-theme")
    html?.classList.remove("dark", "android-theme")

    // Apply dark mode to both html and root
    if (shouldApplyDark) {
      root.classList.add("dark")
      html?.classList.add("dark")
    }

    // Apply theme variant
    if (variant === "android") {
      root.classList.add("android-theme")
      html?.classList.add("android-theme")
    }
  }, [mode, variant, mounted])

  // Save theme to localStorage
  useEffect(() => {
    if (!mounted) return

    try {
      localStorage.setItem(STORAGE_KEY, mode)
      localStorage.setItem(VARIANT_KEY, variant)
    } catch (error) {
      console.warn("Failed to save theme to localStorage:", error)
    }
  }, [mode, variant, mounted])

  const toggleTheme = () => {
    if (mode === "light") {
      setMode("dark")
    } else if (mode === "dark") {
      setMode("system")
    } else {
      setMode("light")
    }
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return <div style={{ visibility: "hidden" }}>{children}</div>
  }

  return (
    <ThemeContext.Provider
      value={{
        mode,
        setMode,
        variant,
        setVariant,
        isDark,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
