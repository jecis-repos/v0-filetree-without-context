"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { colorTokens } from "./design-tokens"

type ThemeMode = "light" | "dark" | "system"
type ColorScheme = "blue" | "purple" | "green" | "orange" | "neutral"

interface ThemeContextType {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  colorScheme: ColorScheme
  setColorScheme: (scheme: ColorScheme) => void
  isDark: boolean
  toggleTheme: () => void
  systemTheme: "light" | "dark"
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "system",
  setMode: () => {},
  colorScheme: "blue",
  setColorScheme: () => {},
  isDark: false,
  toggleTheme: () => {},
  systemTheme: "light",
})

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

const STORAGE_KEY = "enterprise-file-explorer-theme"
const COLOR_SCHEME_KEY = "enterprise-file-explorer-color-scheme"

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>("system")
  const [colorScheme, setColorScheme] = useState<ColorScheme>("blue")
  const [isDark, setIsDark] = useState(false)
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light")
  const [mounted, setMounted] = useState(false)

  // Initialize theme from localStorage
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem(STORAGE_KEY) as ThemeMode
      const savedColorScheme = localStorage.getItem(COLOR_SCHEME_KEY) as ColorScheme

      if (savedMode && ["light", "dark", "system"].includes(savedMode)) {
        setMode(savedMode)
      }

      if (savedColorScheme && ["blue", "purple", "green", "orange", "neutral"].includes(savedColorScheme)) {
        setColorScheme(savedColorScheme)
      }
    } catch (error) {
      console.warn("Failed to load theme from localStorage:", error)
    }

    setMounted(true)
  }, [])

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light")
    }

    // Set initial system theme
    setSystemTheme(mediaQuery.matches ? "dark" : "light")

    // Listen for changes
    mediaQuery.addEventListener("change", handleChange)

    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement

    // Determine if dark mode should be applied
    const shouldApplyDark = mode === "dark" || (mode === "system" && systemTheme === "dark")
    setIsDark(shouldApplyDark)

    // Apply theme classes
    root.classList.toggle("dark", shouldApplyDark)

    // Remove all color scheme classes
    root.classList.remove("theme-blue", "theme-purple", "theme-green", "theme-orange", "theme-neutral")

    // Add current color scheme class
    root.classList.add(`theme-${colorScheme}`)

    // Set CSS custom properties for dynamic theming
    const colors = colorTokens[colorScheme as keyof typeof colorTokens] || colorTokens.primary

    if (shouldApplyDark) {
      root.style.setProperty("--background", "0 0 0")
      root.style.setProperty("--foreground", "255 255 255")
      root.style.setProperty("--card", "0 0 0")
      root.style.setProperty("--card-foreground", "255 255 255")
      root.style.setProperty("--popover", "0 0 0")
      root.style.setProperty("--popover-foreground", "255 255 255")
      root.style.setProperty("--primary", `${colors[600] || colors[500]}`)
      root.style.setProperty("--primary-foreground", "255 255 255")
      root.style.setProperty("--secondary", "39 39 42")
      root.style.setProperty("--secondary-foreground", "250 250 250")
      root.style.setProperty("--muted", "39 39 42")
      root.style.setProperty("--muted-foreground", "161 161 170")
      root.style.setProperty("--accent", "39 39 42")
      root.style.setProperty("--accent-foreground", "250 250 250")
      root.style.setProperty("--destructive", "239 68 68")
      root.style.setProperty("--destructive-foreground", "255 255 255")
      root.style.setProperty("--border", "39 39 42")
      root.style.setProperty("--input", "39 39 42")
      root.style.setProperty("--ring", `${colors[600] || colors[500]}`)
    } else {
      root.style.setProperty("--background", "255 255 255")
      root.style.setProperty("--foreground", "0 0 0")
      root.style.setProperty("--card", "255 255 255")
      root.style.setProperty("--card-foreground", "0 0 0")
      root.style.setProperty("--popover", "255 255 255")
      root.style.setProperty("--popover-foreground", "0 0 0")
      root.style.setProperty("--primary", `${colors[500] || colors[600]}`)
      root.style.setProperty("--primary-foreground", "255 255 255")
      root.style.setProperty("--secondary", "244 244 245")
      root.style.setProperty("--secondary-foreground", "39 39 42")
      root.style.setProperty("--muted", "244 244 245")
      root.style.setProperty("--muted-foreground", "113 113 122")
      root.style.setProperty("--accent", "244 244 245")
      root.style.setProperty("--accent-foreground", "39 39 42")
      root.style.setProperty("--destructive", "239 68 68")
      root.style.setProperty("--destructive-foreground", "255 255 255")
      root.style.setProperty("--border", "228 228 231")
      root.style.setProperty("--input", "228 228 231")
      root.style.setProperty("--ring", `${colors[500] || colors[600]}`)
    }
  }, [mode, colorScheme, systemTheme, mounted])

  // Save theme to localStorage
  useEffect(() => {
    if (!mounted) return

    try {
      localStorage.setItem(STORAGE_KEY, mode)
      localStorage.setItem(COLOR_SCHEME_KEY, colorScheme)
    } catch (error) {
      console.warn("Failed to save theme to localStorage:", error)
    }
  }, [mode, colorScheme, mounted])

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
        colorScheme,
        setColorScheme,
        isDark,
        toggleTheme,
        systemTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
