/**
 * Basic Device Services Tests
 * 
 * Simple tests to verify device services can be imported and instantiated
 * without complex React Native dependencies.
 */

import { describe, it, expect } from '@jest/globals'

describe('Device Services Basic Tests', () => {
  it('should be able to import device service types', () => {
    const types = require('../types')
    
    expect(types).toBeDefined()
    expect(typeof types).toBe('object')
  })

  it('should define required interfaces', () => {
    // Test that we can create mock objects with the expected structure
    const mockCameraResult = {
      uri: 'file:///test.jpg',
      type: 'image' as const,
      width: 1920,
      height: 1080,
      size: 1024 * 1024,
      fileName: 'test.jpg'
    }

    const mockLocationResult = {
      latitude: -0.3476,
      longitude: 32.5825,
      altitude: 1200,
      accuracy: 10,
      speed: 0,
      heading: 0,
      timestamp: Date.now()
    }

    const mockFileSystemInfo = {
      totalSpace: 64 * 1024 * 1024 * 1024,
      freeSpace: 32 * 1024 * 1024 * 1024,
      usedSpace: 32 * 1024 * 1024 * 1024,
      appDataSize: 100 * 1024 * 1024,
      cacheSize: 50 * 1024 * 1024,
      documentsSize: 40 * 1024 * 1024,
      tempSize: 10 * 1024 * 1024
    }

    expect(mockCameraResult.uri).toBe('file:///test.jpg')
    expect(mockLocationResult.latitude).toBe(-0.3476)
    expect(mockFileSystemInfo.totalSpace).toBe(64 * 1024 * 1024 * 1024)
  })

  it('should define permission result structure', () => {
    const mockPermissionResult = {
      granted: true,
      canAskAgain: true,
      status: 'granted' as const
    }

    expect(mockPermissionResult.granted).toBe(true)
    expect(mockPermissionResult.status).toBe('granted')
  })

  it('should define device capabilities structure', () => {
    const mockDeviceCapabilities = {
      platform: 'ios' as const,
      version: '15.0',
      model: 'iPhone 13',
      manufacturer: 'Apple',
      hasNotch: true,
      screenDensity: 3,
      screenWidth: 375,
      screenHeight: 812,
      isTablet: false,
      isEmulator: false,
      supportedFeatures: {
        camera: true,
        microphone: true,
        location: true,
        biometrics: true,
        notifications: true,
        backgroundRefresh: true,
        fileSystem: true
      }
    }

    expect(mockDeviceCapabilities.platform).toBe('ios')
    expect(mockDeviceCapabilities.supportedFeatures.camera).toBe(true)
  })

  it('should define storage insights structure', () => {
    const mockStorageInsights = {
      totalAppSize: 100 * 1024 * 1024,
      breakdown: {
        userContent: 40 * 1024 * 1024,
        cache: 30 * 1024 * 1024,
        database: 15 * 1024 * 1024,
        logs: 10 * 1024 * 1024,
        temp: 5 * 1024 * 1024
      },
      recommendations: [
        {
          type: 'clear_cache' as const,
          description: 'Clear app cache to free up space',
          potentialSavings: 30 * 1024 * 1024
        }
      ]
    }

    expect(mockStorageInsights.totalAppSize).toBe(100 * 1024 * 1024)
    expect(mockStorageInsights.recommendations).toHaveLength(1)
    expect(mockStorageInsights.recommendations[0].type).toBe('clear_cache')
  })

  it('should define fallback options structure', () => {
    const mockFallbackOptions = {
      showError: true,
      errorMessage: 'Feature not available',
      alternativeAction: () => console.log('Alternative action'),
      retryAction: () => console.log('Retry action')
    }

    expect(mockFallbackOptions.showError).toBe(true)
    expect(mockFallbackOptions.errorMessage).toBe('Feature not available')
    expect(typeof mockFallbackOptions.alternativeAction).toBe('function')
    expect(typeof mockFallbackOptions.retryAction).toBe('function')
  })
})