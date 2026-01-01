'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

/**
 * Multi-Tab Conflict Detection Hook
 *
 * Detects when the same session is open in multiple browser tabs
 * and provides a way to handle the conflict.
 */

export interface MultiTabConflictState {
  hasConflict: boolean
  isLeader: boolean
  tabId: string
  conflictTabCount: number
}

interface TabHeartbeat {
  tabId: string
  timestamp: number
  sessionId: string
}

const HEARTBEAT_INTERVAL = 2000 // 2 seconds
const STALE_THRESHOLD = 5000 // 5 seconds - tab is considered stale if no heartbeat

/**
 * Generate a unique tab ID
 */
function generateTabId(): string {
  return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Hook to detect multi-tab conflicts for a given session
 *
 * @param sessionId - The unique session ID to track
 * @param options - Configuration options
 * @returns Conflict state and methods to handle conflicts
 */
export function useMultiTabConflict(
  sessionId: string | null,
  options: {
    onConflictDetected?: (tabCount: number) => void
    onConflictResolved?: () => void
    enabled?: boolean
  } = {}
) {
  const { onConflictDetected, onConflictResolved, enabled = true } = options

  const [state, setState] = useState<MultiTabConflictState>({
    hasConflict: false,
    isLeader: true,
    tabId: '',
    conflictTabCount: 0,
  })

  const tabIdRef = useRef<string>('')
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const previousConflictRef = useRef<boolean>(false)

  // Initialize tab ID
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if we already have a tab ID in sessionStorage
      let storedTabId = sessionStorage.getItem('mockmate_tab_id')
      if (!storedTabId) {
        storedTabId = generateTabId()
        sessionStorage.setItem('mockmate_tab_id', storedTabId)
      }
      tabIdRef.current = storedTabId
      setState(prev => ({ ...prev, tabId: storedTabId! }))
    }
  }, [])

  // Get the storage key for this session
  const getStorageKey = useCallback(() => {
    return `mockmate_session_tabs_${sessionId}`
  }, [sessionId])

  // Update heartbeat in localStorage
  const updateHeartbeat = useCallback(() => {
    if (!sessionId || !tabIdRef.current || typeof localStorage === 'undefined') return

    const key = getStorageKey()
    const heartbeat: TabHeartbeat = {
      tabId: tabIdRef.current,
      timestamp: Date.now(),
      sessionId,
    }

    try {
      // Get existing tabs
      const existingData = localStorage.getItem(key)
      const tabs: TabHeartbeat[] = existingData ? JSON.parse(existingData) : []

      // Update or add our heartbeat
      const existingIndex = tabs.findIndex(t => t.tabId === tabIdRef.current)
      if (existingIndex >= 0) {
        tabs[existingIndex] = heartbeat
      } else {
        tabs.push(heartbeat)
      }

      localStorage.setItem(key, JSON.stringify(tabs))
    } catch (e) {
      console.warn('[MultiTab] Failed to update heartbeat:', e)
    }
  }, [sessionId, getStorageKey])

  // Check for conflicts
  const checkForConflicts = useCallback(() => {
    if (!sessionId || !tabIdRef.current || typeof localStorage === 'undefined') return

    const key = getStorageKey()
    const now = Date.now()

    try {
      const existingData = localStorage.getItem(key)
      if (!existingData) {
        setState(prev => ({
          ...prev,
          hasConflict: false,
          isLeader: true,
          conflictTabCount: 0,
        }))
        return
      }

      const tabs: TabHeartbeat[] = JSON.parse(existingData)

      // Filter out stale tabs
      const activeTabs = tabs.filter(t => now - t.timestamp < STALE_THRESHOLD)

      // Clean up stale tabs
      if (activeTabs.length !== tabs.length) {
        localStorage.setItem(key, JSON.stringify(activeTabs))
      }

      // Determine if we have a conflict
      const otherTabs = activeTabs.filter(t => t.tabId !== tabIdRef.current)
      const hasConflict = otherTabs.length > 0

      // The leader is the tab with the oldest timestamp (first to open)
      const sortedTabs = [...activeTabs].sort((a, b) => {
        // Extract timestamp from tabId (tab_TIMESTAMP_random)
        const aTime = parseInt(a.tabId.split('_')[1] || '0', 10)
        const bTime = parseInt(b.tabId.split('_')[1] || '0', 10)
        return aTime - bTime
      })
      const isLeader = sortedTabs.length === 0 || sortedTabs[0].tabId === tabIdRef.current

      setState(prev => ({
        ...prev,
        hasConflict,
        isLeader,
        conflictTabCount: otherTabs.length,
      }))

      // Trigger callbacks
      if (hasConflict && !previousConflictRef.current) {
        onConflictDetected?.(otherTabs.length + 1)
      } else if (!hasConflict && previousConflictRef.current) {
        onConflictResolved?.()
      }

      previousConflictRef.current = hasConflict
    } catch (e) {
      console.warn('[MultiTab] Failed to check conflicts:', e)
    }
  }, [sessionId, getStorageKey, onConflictDetected, onConflictResolved])

  // Listen for storage events from other tabs
  useEffect(() => {
    if (!enabled || !sessionId || typeof window === 'undefined') return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === getStorageKey()) {
        checkForConflicts()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [enabled, sessionId, getStorageKey, checkForConflicts])

  // Start heartbeat and conflict checking
  useEffect(() => {
    if (!enabled || !sessionId || typeof window === 'undefined') return

    // Initial heartbeat and check
    updateHeartbeat()
    checkForConflicts()

    // Set up intervals
    heartbeatIntervalRef.current = setInterval(updateHeartbeat, HEARTBEAT_INTERVAL)
    checkIntervalRef.current = setInterval(checkForConflicts, HEARTBEAT_INTERVAL)

    // Cleanup on unmount
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }

      // Remove ourselves from the tab list
      if (tabIdRef.current && sessionId) {
        try {
          const key = getStorageKey()
          const existingData = localStorage.getItem(key)
          if (existingData) {
            const tabs: TabHeartbeat[] = JSON.parse(existingData)
            const filteredTabs = tabs.filter(t => t.tabId !== tabIdRef.current)
            if (filteredTabs.length > 0) {
              localStorage.setItem(key, JSON.stringify(filteredTabs))
            } else {
              localStorage.removeItem(key)
            }
          }
        } catch (e) {
          console.warn('[MultiTab] Failed to cleanup:', e)
        }
      }
    }
  }, [enabled, sessionId, updateHeartbeat, checkForConflicts, getStorageKey])

  // Method to claim leadership (close other tabs warning)
  const claimLeadership = useCallback(() => {
    if (!sessionId || !tabIdRef.current) return

    // Clear all other tabs and set ourselves as the only one
    const key = getStorageKey()
    const heartbeat: TabHeartbeat = {
      tabId: tabIdRef.current,
      timestamp: Date.now(),
      sessionId,
    }
    localStorage.setItem(key, JSON.stringify([heartbeat]))

    setState(prev => ({
      ...prev,
      hasConflict: false,
      isLeader: true,
      conflictTabCount: 0,
    }))
  }, [sessionId, getStorageKey])

  return {
    ...state,
    claimLeadership,
  }
}
