"use client"

/**
 * Simple Reactive Store Implementation
 * Provides reactive state management with subscriptions
 */

import { deepEqual, deepClone } from "../utils/json-utils"

export type StoreListener<T> = (state: T) => void
export type StoreSelector<T, R> = (state: T) => R
export type StoreUpdater<T> = (state: T) => T | Partial<T>

export interface Store<T> {
  getState(): T
  setState(updater: StoreUpdater<T>): void
  subscribe(listener: StoreListener<T>): () => void
  select<R>(selector: StoreSelector<T, R>): R
}

export function createStore<T>(initialState: T): Store<T> {
  let state = deepClone(initialState)
  const listeners = new Set<StoreListener<T>>()

  return {
    getState: () => deepClone(state),

    setState: (updater) => {
      try {
        const currentState = state
        const updateResult = updater(currentState)

        let nextState: T

        if (updateResult === currentState) {
          // No change needed
          return
        }

        if (updateResult && typeof updateResult === "object" && !Array.isArray(updateResult)) {
          // Merge partial update
          nextState = { ...currentState, ...updateResult } as T
        } else {
          // Full state replacement
          nextState = updateResult as T
        }

        // Only update if state actually changed
        if (!deepEqual(currentState, nextState)) {
          state = deepClone(nextState)
          // Notify listeners with a copy to prevent mutations
          const stateCopy = deepClone(state)
          listeners.forEach((listener) => {
            try {
              listener(stateCopy)
            } catch (error) {
              console.error("Store listener error:", error)
            }
          })
        }
      } catch (error) {
        console.error("Store setState error:", error)
      }
    },

    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    select: (selector) => {
      try {
        return selector(state)
      } catch (error) {
        console.error("Store selector error:", error)
        throw error
      }
    },
  }
}

// React hook for using stores
import { useEffect, useState, useCallback, useRef } from "react"

export function useStore<T>(store: Store<T>): [T, (updater: StoreUpdater<T>) => void] {
  const [state, setState] = useState(() => store.getState())
  const storeRef = useRef(store)

  useEffect(() => {
    storeRef.current = store
  }, [store])

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setState(newState)
    })

    // Sync with current state
    setState(store.getState())

    return unsubscribe
  }, [store])

  const setStoreState = useCallback((updater: StoreUpdater<T>) => {
    storeRef.current.setState(updater)
  }, [])

  return [state, setStoreState]
}

export function useStoreSelector<T, R>(
  store: Store<T>,
  selector: StoreSelector<T, R>,
  equalityFn?: (a: R, b: R) => boolean,
): R {
  const [selectedState, setSelectedState] = useState(() => {
    try {
      return selector(store.getState())
    } catch (error) {
      console.error("Initial selector error:", error)
      return undefined as R
    }
  })

  const selectorRef = useRef(selector)
  const equalityRef = useRef(equalityFn || deepEqual)

  useEffect(() => {
    selectorRef.current = selector
    equalityRef.current = equalityFn || deepEqual
  })

  useEffect(() => {
    const unsubscribe = store.subscribe((state) => {
      try {
        const newSelectedState = selectorRef.current(state)

        if (!equalityRef.current(selectedState, newSelectedState)) {
          setSelectedState(newSelectedState)
        }
      } catch (error) {
        console.error("Selector error:", error)
      }
    })

    return unsubscribe
  }, [store, selectedState])

  return selectedState
}
