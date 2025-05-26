/**
 * Comprehensive Store Operations Tests
 * Verifies all store functionality works correctly
 */

import { createStore } from "../../store/createStore"
import { healthStore, healthActions } from "../../store/healthStore"
import { fileSystemStore, fileSystemActions } from "../../store/fileSystemStore"

// Mock React hooks for testing
const mockUseState = jest.fn()
const mockUseEffect = jest.fn()
const mockUseCallback = jest.fn()
const mockUseRef = jest.fn()

jest.mock("react", () => ({
  useState: mockUseState,
  useEffect: mockUseEffect,
  useCallback: mockUseCallback,
  useRef: mockUseRef,
}))

describe("Store Operations", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseState.mockImplementation((initial) => [initial, jest.fn()])
    mockUseEffect.mockImplementation((fn) => fn())
    mockUseCallback.mockImplementation((fn) => fn)
    mockUseRef.mockImplementation((initial) => ({ current: initial }))
  })

  describe("Basic Store Operations", () => {
    test("should create store with initial state", () => {
      const initialState = { count: 0, name: "test" }
      const store = createStore(initialState)

      expect(store.getState()).toEqual(initialState)
      expect(store.getState()).not.toBe(initialState) // Should be a copy
    })

    test("should update state correctly", () => {
      const store = createStore({ count: 0, name: "test" })

      store.setState((state) => ({ ...state, count: 1 }))
      expect(store.getState().count).toBe(1)
      expect(store.getState().name).toBe("test")
    })

    test("should handle partial state updates", () => {
      const store = createStore({ count: 0, name: "test", active: true })

      store.setState((state) => ({ count: 5 }))
      const newState = store.getState()

      expect(newState.count).toBe(5)
      expect(newState.name).toBe("test")
      expect(newState.active).toBe(true)
    })

    test("should handle full state replacement", () => {
      const store = createStore({ count: 0, name: "test" })
      const newState = { count: 10, name: "updated", extra: "field" }

      store.setState(() => newState)
      expect(store.getState()).toEqual(newState)
    })

    test("should not update if state is unchanged", () => {
      const store = createStore({ count: 0 })
      const listener = jest.fn()

      store.subscribe(listener)
      store.setState((state) => state) // No change

      expect(listener).not.toHaveBeenCalled()
    })

    test("should notify subscribers on state change", () => {
      const store = createStore({ count: 0 })
      const listener1 = jest.fn()
      const listener2 = jest.fn()

      store.subscribe(listener1)
      store.subscribe(listener2)

      store.setState((state) => ({ count: 1 }))

      expect(listener1).toHaveBeenCalledWith({ count: 1 })
      expect(listener2).toHaveBeenCalledWith({ count: 1 })
    })

    test("should unsubscribe correctly", () => {
      const store = createStore({ count: 0 })
      const listener = jest.fn()

      const unsubscribe = store.subscribe(listener)
      unsubscribe()

      store.setState((state) => ({ count: 1 }))
      expect(listener).not.toHaveBeenCalled()
    })

    test("should handle selector correctly", () => {
      const store = createStore({ user: { name: "John", age: 30 }, count: 0 })

      const userName = store.select((state) => state.user.name)
      const userAge = store.select((state) => state.user.age)

      expect(userName).toBe("John")
      expect(userAge).toBe(30)
    })

    test("should handle complex nested objects", () => {
      const complexState = {
        users: [
          { id: 1, name: "John", profile: { email: "john@test.com", settings: { theme: "dark" } } },
          { id: 2, name: "Jane", profile: { email: "jane@test.com", settings: { theme: "light" } } },
        ],
        metadata: {
          lastUpdated: "2024-01-01",
          version: "1.0.0",
        },
      }

      const store = createStore(complexState)

      // Update nested property
      store.setState((state) => ({
        ...state,
        users: state.users.map((user) =>
          user.id === 1 ? { ...user, profile: { ...user.profile, email: "newemail@test.com" } } : user,
        ),
      }))

      const updatedState = store.getState()
      expect(updatedState.users[0].profile.email).toBe("newemail@test.com")
      expect(updatedState.users[1].profile.email).toBe("jane@test.com")
    })

    test("should handle arrays correctly", () => {
      const store = createStore({ items: [1, 2, 3], tags: ["a", "b"] })

      store.setState((state) => ({
        ...state,
        items: [...state.items, 4],
        tags: state.tags.filter((tag) => tag !== "a"),
      }))

      const newState = store.getState()
      expect(newState.items).toEqual([1, 2, 3, 4])
      expect(newState.tags).toEqual(["b"])
    })

    test("should handle error in setState gracefully", () => {
      const store = createStore({ count: 0 })
      const consoleSpy = jest.spyOn(console, "error").mockImplementation()

      // This should not crash the store
      store.setState(() => {
        throw new Error("Test error")
      })

      expect(consoleSpy).toHaveBeenCalled()
      expect(store.getState().count).toBe(0) // State should remain unchanged

      consoleSpy.mockRestore()
    })

    test("should handle error in listener gracefully", () => {
      const store = createStore({ count: 0 })
      const consoleSpy = jest.spyOn(console, "error").mockImplementation()
      const goodListener = jest.fn()
      const badListener = jest.fn(() => {
        throw new Error("Listener error")
      })

      store.subscribe(goodListener)
      store.subscribe(badListener)

      store.setState((state) => ({ count: 1 }))

      expect(goodListener).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe("Health Store Operations", () => {
    beforeEach(() => {
      healthActions.reset()
    })

    test("should set loading state", () => {
      healthActions.setLoading(true)
      expect(healthStore.getState().isLoading).toBe(true)

      healthActions.setLoading(false)
      expect(healthStore.getState().isLoading).toBe(false)
    })

    test("should set system health", () => {
      const systemHealth = {
        status: "healthy" as const,
        services: 5,
        healthy: 5,
        unhealthy: 0,
        details: [],
      }

      healthActions.setSystemHealth(systemHealth)
      const state = healthStore.getState()

      expect(state.systemHealth).toEqual(systemHealth)
      expect(state.error).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.lastUpdated).toBeTruthy()
    })

    test("should set error state", () => {
      const errorMessage = "Health check failed"

      healthActions.setError(errorMessage)
      const state = healthStore.getState()

      expect(state.error).toBe(errorMessage)
      expect(state.isLoading).toBe(false)
    })

    test("should toggle auto refresh", () => {
      const initialAutoRefresh = healthStore.getState().autoRefresh

      healthActions.toggleAutoRefresh()
      expect(healthStore.getState().autoRefresh).toBe(!initialAutoRefresh)

      healthActions.toggleAutoRefresh()
      expect(healthStore.getState().autoRefresh).toBe(initialAutoRefresh)
    })

    test("should set refresh interval", () => {
      healthActions.setRefreshInterval(5000)
      expect(healthStore.getState().refreshInterval).toBe(5000)

      // Should enforce minimum
      healthActions.setRefreshInterval(500)
      expect(healthStore.getState().refreshInterval).toBe(1000)
    })

    test("should clear error", () => {
      healthActions.setError("Test error")
      expect(healthStore.getState().error).toBe("Test error")

      healthActions.clearError()
      expect(healthStore.getState().error).toBeNull()
    })

    test("should handle invalid inputs gracefully", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation()

      // These should not crash
      healthActions.setLoading(null as any)
      healthActions.setRefreshInterval("invalid" as any)
      healthActions.setError(null as any)

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe("File System Store Operations", () => {
    beforeEach(() => {
      fileSystemActions.reset()
    })

    test("should set file tree", () => {
      const fileTree = [
        {
          id: "1",
          name: "test.txt",
          type: "file" as const,
          path: "/test.txt",
          size: 100,
        },
        {
          id: "2",
          name: "folder",
          type: "directory" as const,
          path: "/folder",
          children: [],
        },
      ]

      fileSystemActions.setFileTree(fileTree)
      const state = fileSystemStore.getState()

      expect(state.fileTree).toEqual(fileTree)
      expect(state.error).toBeNull()
      expect(state.isLoading).toBe(false)
    })

    test("should set current path", () => {
      fileSystemActions.setCurrentPath("/new/path")
      expect(fileSystemStore.getState().currentPath).toBe("/new/path")

      // Should handle empty path
      fileSystemActions.setCurrentPath("")
      expect(fileSystemStore.getState().currentPath).toBe("/")
    })

    test("should set selected files", () => {
      const selectedFiles = ["file1.txt", "file2.txt"]

      fileSystemActions.setSelectedFiles(selectedFiles)
      expect(fileSystemStore.getState().selectedFiles).toEqual(selectedFiles)
    })

    test("should set provider", () => {
      fileSystemActions.setProvider("wasm")
      expect(fileSystemStore.getState().provider).toBe("wasm")

      fileSystemActions.setProvider("php")
      expect(fileSystemStore.getState().provider).toBe("php")

      // Should handle invalid provider
      fileSystemActions.setProvider("invalid" as any)
      expect(fileSystemStore.getState().provider).toBe("memory")
    })

    test("should add operation", () => {
      const operation = {
        id: "op1",
        operation: "create" as const,
        path: "/test.txt",
        timestamp: "2024-01-01T00:00:00Z",
        duration: 100,
        success: true,
      }

      fileSystemActions.addOperation(operation)
      const state = fileSystemStore.getState()

      expect(state.operations).toHaveLength(1)
      expect(state.operations[0]).toEqual(operation)
    })

    test("should limit operations history", () => {
      // Add more than 100 operations
      for (let i = 0; i < 105; i++) {
        fileSystemActions.addOperation({
          id: `op${i}`,
          operation: "create" as const,
          path: `/test${i}.txt`,
          timestamp: "2024-01-01T00:00:00Z",
          duration: 100,
          success: true,
        })
      }

      const state = fileSystemStore.getState()
      expect(state.operations).toHaveLength(100)
      expect(state.operations[0].id).toBe("op104") // Most recent first
    })

    test("should handle invalid inputs gracefully", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation()

      // These should not crash
      fileSystemActions.setFileTree(null as any)
      fileSystemActions.setSelectedFiles("invalid" as any)
      fileSystemActions.setCurrentPath(null as any)

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe("Store Performance", () => {
    test("should handle large state efficiently", () => {
      const largeState = {
        items: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          data: { value: i * 2, active: i % 2 === 0 },
        })),
        metadata: { count: 10000 },
      }

      const store = createStore(largeState)
      const start = performance.now()

      // Update a single item
      store.setState((state) => ({
        ...state,
        items: state.items.map((item) => (item.id === 5000 ? { ...item, name: "Updated Item" } : item)),
      }))

      const end = performance.now()
      const duration = end - start

      expect(duration).toBeLessThan(100) // Should complete in less than 100ms
      expect(store.getState().items[5000].name).toBe("Updated Item")
    })

    test("should handle many subscribers efficiently", () => {
      const store = createStore({ count: 0 })
      const listeners = Array.from({ length: 1000 }, () => jest.fn())

      // Subscribe all listeners
      const unsubscribes = listeners.map((listener) => store.subscribe(listener))

      const start = performance.now()
      store.setState((state) => ({ count: state.count + 1 }))
      const end = performance.now()

      const duration = end - start
      expect(duration).toBeLessThan(50) // Should complete in less than 50ms

      // All listeners should be called
      listeners.forEach((listener) => {
        expect(listener).toHaveBeenCalledWith({ count: 1 })
      })

      // Cleanup
      unsubscribes.forEach((unsubscribe) => unsubscribe())
    })

    test("should handle deep object updates efficiently", () => {
      const deepState = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  data: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `value${i}` })),
                },
              },
            },
          },
        },
      }

      const store = createStore(deepState)
      const start = performance.now()

      store.setState((state) => ({
        ...state,
        level1: {
          ...state.level1,
          level2: {
            ...state.level1.level2,
            level3: {
              ...state.level1.level2.level3,
              level4: {
                ...state.level1.level2.level3.level4,
                level5: {
                  ...state.level1.level2.level3.level4.level5,
                  data: state.level1.level2.level3.level4.level5.data.map((item) =>
                    item.id === 500 ? { ...item, value: "updated" } : item,
                  ),
                },
              },
            },
          },
        },
      }))

      const end = performance.now()
      const duration = end - start

      expect(duration).toBeLessThan(100) // Should complete in less than 100ms
      expect(store.getState().level1.level2.level3.level4.level5.data[500].value).toBe("updated")
    })
  })

  describe("Store Memory Management", () => {
    test("should not leak memory with many subscriptions", () => {
      const store = createStore({ count: 0 })
      const initialMemory = process.memoryUsage().heapUsed

      // Create and destroy many subscriptions
      for (let i = 0; i < 1000; i++) {
        const unsubscribe = store.subscribe(() => {})
        unsubscribe()
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be minimal (less than 1MB)
      expect(memoryIncrease).toBeLessThan(1024 * 1024)
    })

    test("should handle circular references in state", () => {
      const circularObj: any = { name: "test" }
      circularObj.self = circularObj

      const store = createStore({ data: circularObj })

      // This should not crash
      expect(() => {
        store.setState((state) => ({ data: { ...state.data, updated: true } }))
      }).not.toThrow()
    })
  })
})
