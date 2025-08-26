/**
 * Network Monitor Tests
 */

import { NetworkMonitor } from '../networkMonitor'

// Mock NetInfo
const mockNetInfo = {
  addEventListener: jest.fn(),
  fetch: jest.fn()
}

jest.mock('@react-native-community/netinfo', () => mockNetInfo)

describe('NetworkMonitor', () => {
  let networkMonitor: NetworkMonitor

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset singleton instance
    ;(NetworkMonitor as any).instance = undefined
    
    // Mock initial network state
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      type: 'wifi',
      isInternetReachable: true
    })
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = NetworkMonitor.getInstance()
      const instance2 = NetworkMonitor.getInstance()
      
      expect(instance1).toBe(instance2)
    })
  })

  describe('Initialization', () => {
    it('should set up event listener and fetch initial state', async () => {
      networkMonitor = NetworkMonitor.getInstance()
      
      expect(mockNetInfo.addEventListener).toHaveBeenCalled()
      expect(mockNetInfo.fetch).toHaveBeenCalled()
    })
  })

  describe('Network Status', () => {
    beforeEach(() => {
      networkMonitor = NetworkMonitor.getInstance()
    })

    it('should return current network status', () => {
      const status = networkMonitor.getCurrentStatus()
      
      expect(status).toEqual({
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true
      })
    })

    it('should detect online status', () => {
      expect(networkMonitor.isOnline()).toBe(true)
    })

    it('should detect offline status', () => {
      // Mock offline state
      ;(networkMonitor as any).currentStatus = {
        isConnected: false,
        type: 'none',
        isInternetReachable: false
      }
      
      expect(networkMonitor.isOffline()).toBe(true)
      expect(networkMonitor.isOnline()).toBe(false)
    })

    it('should handle null isInternetReachable', () => {
      ;(networkMonitor as any).currentStatus = {
        isConnected: true,
        type: 'wifi',
        isInternetReachable: null
      }
      
      expect(networkMonitor.isOnline()).toBe(true)
    })

    it('should handle false isInternetReachable', () => {
      ;(networkMonitor as any).currentStatus = {
        isConnected: true,
        type: 'wifi',
        isInternetReachable: false
      }
      
      expect(networkMonitor.isOnline()).toBe(false)
    })
  })

  describe('Connection Types', () => {
    beforeEach(() => {
      networkMonitor = NetworkMonitor.getInstance()
    })

    it('should detect WiFi connection', () => {
      ;(networkMonitor as any).currentStatus = {
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true
      }
      
      expect(networkMonitor.isWifiConnection()).toBe(true)
      expect(networkMonitor.isCellularConnection()).toBe(false)
      expect(networkMonitor.getConnectionType()).toBe('wifi')
    })

    it('should detect cellular connection', () => {
      ;(networkMonitor as any).currentStatus = {
        isConnected: true,
        type: 'cellular',
        isInternetReachable: true
      }
      
      expect(networkMonitor.isCellularConnection()).toBe(true)
      expect(networkMonitor.isWifiConnection()).toBe(false)
      expect(networkMonitor.getConnectionType()).toBe('cellular')
    })
  })

  describe('Event Listeners', () => {
    beforeEach(() => {
      networkMonitor = NetworkMonitor.getInstance()
    })

    it('should add and remove listeners', () => {
      const listener = jest.fn()
      
      const unsubscribe = networkMonitor.addListener(listener)
      
      expect(typeof unsubscribe).toBe('function')
      
      // Simulate network change
      const mockState = {
        isConnected: false,
        type: 'none',
        isInternetReachable: false
      }
      
      // Trigger the listener manually
      ;(networkMonitor as any).notifyListeners(mockState)
      
      expect(listener).toHaveBeenCalledWith(mockState)
      
      // Unsubscribe
      unsubscribe()
      
      // Trigger again - listener should not be called
      listener.mockClear()
      ;(networkMonitor as any).notifyListeners(mockState)
      
      expect(listener).not.toHaveBeenCalled()
    })

    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error')
      })
      const normalListener = jest.fn()
      
      networkMonitor.addListener(errorListener)
      networkMonitor.addListener(normalListener)
      
      const mockState = {
        isConnected: false,
        type: 'none',
        isInternetReachable: false
      }
      
      // Should not throw despite error in one listener
      expect(() => {
        ;(networkMonitor as any).notifyListeners(mockState)
      }).not.toThrow()
      
      expect(errorListener).toHaveBeenCalled()
      expect(normalListener).toHaveBeenCalled()
    })

    it('should remove all listeners', () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()
      
      networkMonitor.addListener(listener1)
      networkMonitor.addListener(listener2)
      
      networkMonitor.removeAllListeners()
      
      const mockState = {
        isConnected: false,
        type: 'none',
        isInternetReachable: false
      }
      
      ;(networkMonitor as any).notifyListeners(mockState)
      
      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).not.toHaveBeenCalled()
    })
  })

  describe('Status Change Detection', () => {
    beforeEach(() => {
      networkMonitor = NetworkMonitor.getInstance()
    })

    it('should detect connection status change', () => {
      const listener = jest.fn()
      networkMonitor.addListener(listener)
      
      const newState = {
        isConnected: false,
        type: 'none',
        isInternetReachable: false
      }
      
      // Simulate NetInfo event
      const eventCallback = mockNetInfo.addEventListener.mock.calls[0][0]
      eventCallback(newState)
      
      expect(listener).toHaveBeenCalledWith(newState)
    })

    it('should not notify if status unchanged', () => {
      const listener = jest.fn()
      networkMonitor.addListener(listener)
      
      const sameState = {
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true
      }
      
      // Simulate NetInfo event with same state
      const eventCallback = mockNetInfo.addEventListener.mock.calls[0][0]
      eventCallback(sameState)
      
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('Internet Reachability Check', () => {
    beforeEach(() => {
      networkMonitor = NetworkMonitor.getInstance()
    })

    it('should check internet reachability', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true
      })
      
      const isReachable = await networkMonitor.checkInternetReachability()
      
      expect(isReachable).toBe(true)
      expect(mockNetInfo.fetch).toHaveBeenCalled()
    })

    it('should handle reachability check errors', async () => {
      mockNetInfo.fetch.mockRejectedValue(new Error('Network error'))
      
      const isReachable = await networkMonitor.checkInternetReachability()
      
      expect(isReachable).toBe(false)
    })

    it('should handle null isInternetReachable in check', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        type: 'wifi',
        isInternetReachable: null
      })
      
      const isReachable = await networkMonitor.checkInternetReachability()
      
      expect(isReachable).toBe(false)
    })
  })
})