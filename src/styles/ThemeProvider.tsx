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
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "system",
  setMode: () => {},
  colorScheme: "blue",
  setColorScheme: () => {},
  isDark: false,
})

export const useTheme = () => useContext(ThemeContext)

const colorSchemeMap = {
  blue: {
    primary: colorTokens.secondary,
    accent: colorTokens.primary,
  },
  purple: {
    primary: colorTokens.primary,
    accent: colorTokens.secondary,
  },
  green: {
    primary: colorTokens.success,
    accent: colorTokens.secondary,
  },
  orange: {
    primary: colorTokens.warning,
    accent: colorTokens.primary,
  },
  neutral: {
    primary: colorTokens.neutral,
    accent: colorTokens.primary,
  },
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>("system")
  const [colorScheme, setColorScheme] = useState<ColorScheme>("blue")
  const [isDark, setIsDark] = useState(false)

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    // Determine if dark mode should be applied
    const shouldApplyDark = mode === "dark" || (mode === "system" && systemDark)

    setIsDark(shouldApplyDark)

    // Apply dark mode class
    if (shouldApplyDark) {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }

    // Apply color scheme CSS variables
    const scheme = colorSchemeMap[colorScheme]
    Object.entries(scheme.primary).forEach(([key, value]) => {
      root.style.setProperty(`--color-primary-${key}`, value)
    })
    Object.entries(scheme.accent).forEach(([key, value]) => {
      root.style.setProperty(`--color-accent-${key}`, value)
    })

    // Listen for system preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => {
      if (mode === "system") {
        setIsDark(mediaQuery.matches)
        if (mediaQuery.matches) {
          root.classList.add("dark")
        } else {
          root.classList.remove("dark")
        }
      }
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [mode, colorScheme])

  return (
    <ThemeContext.Provider
      value={{
        mode,
        setMode,
        colorScheme,
        setColorScheme,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
