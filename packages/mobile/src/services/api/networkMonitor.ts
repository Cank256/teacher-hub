/**
 * Network Status Monitor
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo'
import { NetworkStatus } from './types'

export class NetworkMonitor {
  private static instance: NetworkMonitor
  private listeners: Set<(status: NetworkStatus) => void> = new Set()
  private currentStatus: NetworkStatus = {
    isConnected: true,
    type: 'unknown',
    isInternetReachable: null
  }

  private constructor() {
    this.initialize()
  }

  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor()
    }
    return NetworkMonitor.instance
  }

  private initialize(): void {
    // Subscribe to network state changes
    NetInfo.addEventListener((state: NetInfoState) => {
      const networkStatus: NetworkStatus = {
        isConnected: state.isConnected ?? false,
        type: state.type,
        isInternetReachable: state.isInternetReachable
      }

      const statusChanged = this.hasStatusChanged(networkStatus)
      this.currentStatus = networkStatus

      if (statusChanged) {
        this.notifyListeners(networkStatus)
      }
    })

    // Get initial network state
    NetInfo.fetch().then((state: NetInfoState) => {
      this.currentStatus = {
        isConnected: state.isConnected ?? false,
        type: state.type,
        isInternetReachable: state.isInternetReachable
      }
      this.notifyListeners(this.currentStatus)
    })
  }

  private hasStatusChanged(newStatus: NetworkStatus): boolean {
    return (
      this.currentStatus.isConnected !== newStatus.isConnected ||
      this.currentStatus.type !== newStatus.type ||
      this.currentStatus.isInternetReachable !== newStatus.isInternetReachable
    )
  }

  private notifyListeners(status: NetworkStatus): void {
    this.listeners.forEach(listener => {
      try {
        listener(status)
      } catch (error) {
        console.error('Error in network status listener:', error)
      }
    })
  }

  getCurrentStatus(): NetworkStatus {
    return { ...this.currentStatus }
  }

  isOnline(): boolean {
    return this.currentStatus.isConnected && 
           this.currentStatus.isInternetReachable !== false
  }

  isOffline(): boolean {
    return !this.isOnline()
  }

  addListener(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.add(listener)
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  removeAllListeners(): void {
    this.listeners.clear()
  }

  async checkInternetReachability(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch()
      return state.isInternetReachable ?? false
    } catch (error) {
      console.error('Failed to check internet reachability:', error)
      return false
    }
  }

  getConnectionType(): string {
    return this.currentStatus.type
  }

  isWifiConnection(): boolean {
    return this.currentStatus.type === 'wifi'
  }

  isCellularConnection(): boolean {
    return this.currentStatus.type === 'cellular'
  }
}