/**
 * Device Integration Services
 * 
 * Centralized exports for all device integration services
 * including camera, file system, location, and device capabilities.
 */

export { default as CameraService } from './CameraService'
export { default as FileSystemService } from './FileSystemService'
export { default as LocationService } from './LocationService'
export { default as DeviceCapabilitiesService } from './DeviceCapabilitiesService'
export { default as StorageInsightsService } from './StorageInsightsService'

export * from './types'

// Re-export commonly used types for convenience
export type {
  CameraOptions,
  CameraResult,
  DocumentScanOptions,
  DocumentScanResult,
  FileSystemInfo,
  FilePickerOptions,
  FilePickerResult,
  LocationOptions,
  LocationResult,
  LocationPermissionStatus,
  DeviceFeatureAvailability,
  DeviceCapabilities,
  StorageInsights,
  PermissionRequest,
  PermissionResult,
  FallbackOptions,
  NativeModuleError
} from './types'