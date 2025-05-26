import { createStore } from "./createStore"
import type { FileNode, FileSystemOperation } from "../repositories/FileSystemRepository"

export interface FileSystemState {
  currentPath: string
  fileTree: FileNode[]
  selectedFiles: string[]
  isLoading: boolean
  error: string | null
  operations: FileSystemOperation[]
  provider: "memory" | "wasm" | "php"
}

const initialState: FileSystemState = {
  currentPath: "/",
  fileTree: [],
  selectedFiles: [],
  isLoading: false,
  error: null,
  operations: [],
  provider: "memory",
}

export const fileSystemStore = createStore(initialState)

// File system store actions with better error handling
export const fileSystemActions = {
  setLoading: (isLoading: boolean) => {
    try {
      fileSystemStore.setState((state) => ({
        ...state,
        isLoading: Boolean(isLoading),
      }))
    } catch (error) {
      console.error("Error setting loading state:", error)
    }
  },

  setFileTree: (fileTree: FileNode[]) => {
    try {
      fileSystemStore.setState((state) => ({
        ...state,
        fileTree: Array.isArray(fileTree) ? [...fileTree] : [],
        error: null,
        isLoading: false,
      }))
    } catch (error) {
      console.error("Error setting file tree:", error)
    }
  },

  setCurrentPath: (currentPath: string) => {
    try {
      fileSystemStore.setState((state) => ({
        ...state,
        currentPath: String(currentPath || "/"),
      }))
    } catch (error) {
      console.error("Error setting current path:", error)
    }
  },

  setSelectedFiles: (selectedFiles: string[]) => {
    try {
      fileSystemStore.setState((state) => ({
        ...state,
        selectedFiles: Array.isArray(selectedFiles) ? [...selectedFiles] : [],
      }))
    } catch (error) {
      console.error("Error setting selected files:", error)
    }
  },

  setProvider: (provider: "memory" | "wasm" | "php") => {
    try {
      const validProviders = ["memory", "wasm", "php"]
      const validProvider = validProviders.includes(provider) ? provider : "memory"

      fileSystemStore.setState((state) => ({
        ...state,
        provider: validProvider,
      }))
    } catch (error) {
      console.error("Error setting provider:", error)
    }
  },

  addOperation: (operation: FileSystemOperation) => {
    try {
      fileSystemStore.setState((state) => ({
        ...state,
        operations: [{ ...operation }, ...state.operations].slice(0, 100), // Keep last 100
      }))
    } catch (error) {
      console.error("Error adding operation:", error)
    }
  },

  setError: (error: string) => {
    try {
      fileSystemStore.setState((state) => ({
        ...state,
        error: String(error || ""),
        isLoading: false,
      }))
    } catch (err) {
      console.error("Error setting error state:", err)
    }
  },

  clearError: () => {
    try {
      fileSystemStore.setState((state) => ({
        ...state,
        error: null,
      }))
    } catch (error) {
      console.error("Error clearing error:", error)
    }
  },

  reset: () => {
    try {
      fileSystemStore.setState(() => ({ ...initialState }))
    } catch (error) {
      console.error("Error resetting file system store:", error)
    }
  },
}
