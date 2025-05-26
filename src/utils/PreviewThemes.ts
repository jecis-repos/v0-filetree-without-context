export interface PreviewTheme {
  id: string
  name: string
  colors: {
    background: string
    foreground: string
    primary: string
    secondary: string
    accent: string
    muted: string
    border: string
    directoryIcon: string
    fileIcon: string
    textPrimary: string
    textSecondary: string
    hover: string
  }
  fonts: {
    primary: string
    secondary: string
    mono: string
  }
  spacing: {
    padding: number
    margin: number
    lineHeight: number
    indentation: number
  }
  icons: {
    size: number
    style: "outline" | "filled" | "minimal"
  }
  layout: {
    showLines: boolean
    showIcons: boolean
    compactMode: boolean
    showFileSize: boolean
    showLastModified: boolean
  }
}

export const previewThemes: Record<string, PreviewTheme> = {
  modern: {
    id: "modern",
    name: "Modern",
    colors: {
      background: "#ffffff",
      foreground: "#1f2937",
      primary: "#3b82f6",
      secondary: "#6b7280",
      accent: "#10b981",
      muted: "#f3f4f6",
      border: "#e5e7eb",
      directoryIcon: "#3b82f6",
      fileIcon: "#6b7280",
      textPrimary: "#111827",
      textSecondary: "#6b7280",
      hover: "#f9fafb",
    },
    fonts: {
      primary: "Inter, system-ui, sans-serif",
      secondary: "Inter, system-ui, sans-serif",
      mono: "JetBrains Mono, Consolas, monospace",
    },
    spacing: {
      padding: 12,
      margin: 8,
      lineHeight: 1.5,
      indentation: 20,
    },
    icons: {
      size: 16,
      style: "outline",
    },
    layout: {
      showLines: true,
      showIcons: true,
      compactMode: false,
      showFileSize: true,
      showLastModified: false,
    },
  },
  dark: {
    id: "dark",
    name: "Dark",
    colors: {
      background: "#0f172a",
      foreground: "#f1f5f9",
      primary: "#60a5fa",
      secondary: "#94a3b8",
      accent: "#34d399",
      muted: "#1e293b",
      border: "#334155",
      directoryIcon: "#60a5fa",
      fileIcon: "#94a3b8",
      textPrimary: "#f1f5f9",
      textSecondary: "#94a3b8",
      hover: "#1e293b",
    },
    fonts: {
      primary: "Inter, system-ui, sans-serif",
      secondary: "Inter, system-ui, sans-serif",
      mono: "JetBrains Mono, Consolas, monospace",
    },
    spacing: {
      padding: 12,
      margin: 8,
      lineHeight: 1.5,
      indentation: 20,
    },
    icons: {
      size: 16,
      style: "outline",
    },
    layout: {
      showLines: true,
      showIcons: true,
      compactMode: false,
      showFileSize: true,
      showLastModified: false,
    },
  },
  minimal: {
    id: "minimal",
    name: "Minimal",
    colors: {
      background: "#fefefe",
      foreground: "#2d3748",
      primary: "#4a5568",
      secondary: "#718096",
      accent: "#38b2ac",
      muted: "#f7fafc",
      border: "#e2e8f0",
      directoryIcon: "#4a5568",
      fileIcon: "#718096",
      textPrimary: "#2d3748",
      textSecondary: "#718096",
      hover: "#f7fafc",
    },
    fonts: {
      primary: "system-ui, -apple-system, sans-serif",
      secondary: "system-ui, -apple-system, sans-serif",
      mono: "SF Mono, Monaco, monospace",
    },
    spacing: {
      padding: 8,
      margin: 4,
      lineHeight: 1.4,
      indentation: 16,
    },
    icons: {
      size: 14,
      style: "minimal",
    },
    layout: {
      showLines: false,
      showIcons: true,
      compactMode: true,
      showFileSize: false,
      showLastModified: false,
    },
  },
  terminal: {
    id: "terminal",
    name: "Terminal",
    colors: {
      background: "#000000",
      foreground: "#00ff00",
      primary: "#00ff00",
      secondary: "#008000",
      accent: "#ffff00",
      muted: "#1a1a1a",
      border: "#333333",
      directoryIcon: "#00ff00",
      fileIcon: "#ffffff",
      textPrimary: "#00ff00",
      textSecondary: "#008000",
      hover: "#1a1a1a",
    },
    fonts: {
      primary: "Courier New, monospace",
      secondary: "Courier New, monospace",
      mono: "Courier New, monospace",
    },
    spacing: {
      padding: 10,
      margin: 6,
      lineHeight: 1.3,
      indentation: 24,
    },
    icons: {
      size: 12,
      style: "minimal",
    },
    layout: {
      showLines: true,
      showIcons: false,
      compactMode: true,
      showFileSize: true,
      showLastModified: false,
    },
  },
  elegant: {
    id: "elegant",
    name: "Elegant",
    colors: {
      background: "#faf9f7",
      foreground: "#3c3c3c",
      primary: "#8b5a3c",
      secondary: "#a0a0a0",
      accent: "#d4af37",
      muted: "#f5f4f2",
      border: "#e8e6e3",
      directoryIcon: "#8b5a3c",
      fileIcon: "#a0a0a0",
      textPrimary: "#3c3c3c",
      textSecondary: "#a0a0a0",
      hover: "#f5f4f2",
    },
    fonts: {
      primary: "Georgia, serif",
      secondary: "Georgia, serif",
      mono: "Monaco, monospace",
    },
    spacing: {
      padding: 16,
      margin: 12,
      lineHeight: 1.6,
      indentation: 24,
    },
    icons: {
      size: 18,
      style: "filled",
    },
    layout: {
      showLines: true,
      showIcons: true,
      compactMode: false,
      showFileSize: true,
      showLastModified: true,
    },
  },
}

export const getTheme = (themeId: string): PreviewTheme => {
  return previewThemes[themeId] || previewThemes.modern
}

export const getAvailableThemes = (): PreviewTheme[] => {
  return Object.values(previewThemes)
}
