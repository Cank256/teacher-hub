/**
 * Device Integration Types
 * 
 * Type definitions for device integration services including camera,
 * file system, location, and storage management.
 */

export interface CameraOptions {
  mediaType: 'photo' | 'video' | 'mixed'
  quality: 'low' | 'medium' | 'high'
  allowsEditing?: boolean
  aspect?: [number, number]
  maxWidth?: number
  maxHeight?: number
  maxDuration?: number
}

export interface CameraResult {
  uri: string
  type: 'image' | 'video'
  width?: number
  height?: number
  duration?: number
  size: number
  fileName?: string
}

export interface DocumentScanOptions {
  quality: 'low' | 'medium' | 'high'
  detectEdges?: boolean
  enhanceImage?: boolean
  allowMultiple?: boolean
  maxPages?: number
}

export interface DocumentScanResult {
  pages: Array<{
    uri: string
    width: number
    height: number
    size: number
  }>
  totalSize: number
}

export interface FileSystemInfo {
  totalSpace: number
  freeSpace: number
  usedSpace: number
  appDataSize: number
  cacheSize: number
  documentsSize: number
  tempSize: number
}

export interface FilePickerOptions {
  type: 'images' | 'videos' | 'audio' | 'documents' | 'all'
  allowMultiple?: boolean
  maxSize?: number
  maxFiles?: number
}

export interface FilePickerResult {
  files: Array<{
    uri: string
    name: string
    type: string
    size: number
  }>
}

export interface LocationOptions {
  accuracy: 'lowest' | 'low' | 'balanced' | 'high' | 'highest'
  timeout?: number
  maximumAge?: number
  enableHighAccuracy?: boolean
}

export interface LocationResult {
  latitude: number
  longitude: number
  altitude?: number
  accuracy?: number
  speed?: number
  heading?: number
  timestamp: number
}

export interface LocationPermissionStatus {
  granted: boolean
  canAskAgain: boolean
  status: 'granted' | 'denied' | 'undetermined' | 'restricted'
}

export interface DeviceFeatureAvailability {
  camera: boolean
  microphone: boolean
  location: boolean
  biometrics: boolean
  notifications: boolean
  backgroundRefresh: boolean
  fileSystem: boolean
}

export interface StorageInsights {
  totalAppSize: number
  breakdown: {
    userContent: number
    cache: number
    database: number
    logs: number
    temp: number
  }
  recommendations: Array<{
    type: 'clear_cache' | 'remove_old_files' | 'compress_images' | 'archive_data'
    description: string
    potentialSavings: number
  }>
}

export interface PermissionRequest {
  type: 'camera' | 'microphone' | 'location' | 'notifications' | 'storage'
  rationale: string
  required: boolean
}

export interface PermissionResult {
  granted: boolean
  canAskAgain: boolean
  status: 'granted' | 'denied' | 'undetermined' | 'restricted'
}

export interface DeviceCapabilities {
  platform: 'ios' | 'android'
  version: string
  model: string
  manufacturer: string
  hasNotch: boolean
  screenDensity: number
  screenWidth: number
  screenHeight: number
  isTablet: boolean
  isEmulator: boolean
  supportedFeatures: DeviceFeatureAvailability
}

export interface NativeModuleError extends Error {
  code: string
  userInfo?: Record<string, any>
  nativeStackAndroid?: string[]
  nativeStackIOS?: string[]
}

export interface FallbackOptions {
  showError?: boolean
  errorMessage?: string
  alternativeAction?: () => void
  retryAction?: () => void
}