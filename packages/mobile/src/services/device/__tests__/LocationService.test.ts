/**
 * Location Service Tests
 * 
 * Tests for location services integration including permissions,
 * location tracking, and privacy controls.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import * as Location from 'expo-location'
import { Alert } from 'react-native'
import LocationService from '../LocationService'
import { 
  createMockLocationResult, 
  mockPermissionGranted, 
  mockPermissionDenied 
} from './setup'

// Mock modules
const mockLocation = Location as jest.Mocked<typeof Location>
const mockAlert = Alert as jest.Mocked<typeof Alert>

describe('LocationService', () => {
  let locationService: LocationService

  beforeEach(() => {
    locationService = LocationService.getInstance()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('Permission Management', () => {
    it('should request foreground location permission successfully', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })

      const result = await locationService.requestLocationPermission(false)

      expect(result).toEqual(mockPermissionGranted)
      expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1)
    })

    it('should request background location permission', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })

      mockLocation.requestBackgroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })

      const result = await locationService.requestLocationPermission(true)

      expect(result.granted).toBe(true)
      expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1)
      expect(mockLocation.requestBackgroundPermissionsAsync).toHaveBeenCalledTimes(1)
    })

    it('should handle location permission denial', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied',
        canAskAgain: true,
        granted: false,
        expires: 'never'
      })

      const result = await locationService.requestLocationPermission()

      expect(result).toEqual(mockPermissionDenied)
    })

    it('should get location permission status', async () => {
      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })

      const status = await locationService.getLocationPermissionStatus()

      expect(status.granted).toBe(true)
      expect(mockLocation.getForegroundPermissionsAsync).toHaveBeenCalledTimes(1)
    })

    it('should check if location services are enabled', async () => {
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(true)

      const isEnabled = await locationService.isLocationEnabled()

      expect(isEnabled).toBe(true)
      expect(mockLocation.hasServicesEnabledAsync).toHaveBeenCalledTimes(1)
    })
  })

  describe('Location Retrieval', () => {
    beforeEach(() => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(true)
    })

    it('should get current location successfully', async () => {
      const mockLocationData = {
        coords: {
          latitude: -0.3476,
          longitude: 32.5825,
          altitude: 1200,
          accuracy: 10,
          speed: 0,
          heading: 0
        },
        timestamp: Date.now()
      }

      mockLocation.getCurrentPositionAsync.mockResolvedValue(mockLocationData)

      const result = await locationService.getCurrentLocation({
        accuracy: 'high',
        timeout: 10000
      })

      expect(result).toEqual({
        latitude: -0.3476,
        longitude: 32.5825,
        altitude: 1200,
        accuracy: 10,
        speed: 0,
        heading: 0,
        timestamp: mockLocationData.timestamp
      })

      expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: Location.Accuracy.High,
        maximumAge: undefined,
        timeout: 10000
      })
    })

    it('should handle location permission denial during location retrieval', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied',
        canAskAgain: true,
        granted: false,
        expires: 'never'
      })

      const result = await locationService.getCurrentLocation()

      expect(result).toBeNull()
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Location Permission Required',
        'Location permission is required to use location-based features. Please grant permission to continue.',
        expect.any(Array)
      )
    })

    it('should handle disabled location services', async () => {
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(false)

      const result = await locationService.getCurrentLocation()

      expect(result).toBeNull()
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Location Services Disabled',
        'Location services are disabled on your device. Please enable them in your device settings to use location features.',
        expect.any(Array)
      )
    })

    it('should map accuracy settings correctly', async () => {
      const mockLocationData = {
        coords: {
          latitude: 0,
          longitude: 0,
          altitude: null,
          accuracy: null,
          speed: null,
          heading: null
        },
        timestamp: Date.now()
      }

      mockLocation.getCurrentPositionAsync.mockResolvedValue(mockLocationData)

      // Test different accuracy levels
      await locationService.getCurrentLocation({ accuracy: 'lowest' })
      expect(mockLocation.getCurrentPositionAsync).toHaveBeenLastCalledWith(
        expect.objectContaining({ accuracy: Location.Accuracy.Lowest })
      )

      await locationService.getCurrentLocation({ accuracy: 'low' })
      expect(mockLocation.getCurrentPositionAsync).toHaveBeenLastCalledWith(
        expect.objectContaining({ accuracy: Location.Accuracy.Low })
      )

      await locationService.getCurrentLocation({ accuracy: 'balanced' })
      expect(mockLocation.getCurrentPositionAsync).toHaveBeenLastCalledWith(
        expect.objectContaining({ accuracy: Location.Accuracy.Balanced })
      )

      await locationService.getCurrentLocation({ accuracy: 'high' })
      expect(mockLocation.getCurrentPositionAsync).toHaveBeenLastCalledWith(
        expect.objectContaining({ accuracy: Location.Accuracy.High })
      )

      await locationService.getCurrentLocation({ accuracy: 'highest' })
      expect(mockLocation.getCurrentPositionAsync).toHaveBeenLastCalledWith(
        expect.objectContaining({ accuracy: Location.Accuracy.Highest })
      )
    })
  })

  describe('Location Watching', () => {
    beforeEach(() => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })
    })

    it('should start watching location successfully', async () => {
      const mockSubscription = {
        remove: jest.fn()
      }

      mockLocation.watchPositionAsync.mockResolvedValue(mockSubscription as any)

      const callback = jest.fn()
      const result = await locationService.watchLocation(callback, {
        accuracy: 'balanced'
      })

      expect(result).toBe(true)
      expect(mockLocation.watchPositionAsync).toHaveBeenCalledWith(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10
        },
        expect.any(Function)
      )
    })

    it('should handle location updates in watch mode', async () => {
      const mockSubscription = {
        remove: jest.fn()
      }

      let locationCallback: ((location: any) => void) | undefined

      mockLocation.watchPositionAsync.mockImplementation(async (options, callback) => {
        locationCallback = callback
        return mockSubscription as any
      })

      const callback = jest.fn()
      await locationService.watchLocation(callback)

      // Simulate location update
      const mockLocationUpdate = {
        coords: {
          latitude: -0.3476,
          longitude: 32.5825,
          altitude: 1200,
          accuracy: 10,
          speed: 5,
          heading: 90
        },
        timestamp: Date.now()
      }

      if (locationCallback) {
        locationCallback(mockLocationUpdate)
      }

      expect(callback).toHaveBeenCalledWith({
        latitude: -0.3476,
        longitude: 32.5825,
        altitude: 1200,
        accuracy: 10,
        speed: 5,
        heading: 90,
        timestamp: mockLocationUpdate.timestamp
      })
    })

    it('should stop watching location', async () => {
      const mockSubscription = {
        remove: jest.fn()
      }

      mockLocation.watchPositionAsync.mockResolvedValue(mockSubscription as any)

      const callback = jest.fn()
      await locationService.watchLocation(callback)
      await locationService.stopWatchingLocation()

      expect(mockSubscription.remove).toHaveBeenCalledTimes(1)
    })

    it('should handle watch location permission denial', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied',
        canAskAgain: false,
        granted: false,
        expires: 'never'
      })

      const callback = jest.fn()
      const result = await locationService.watchLocation(callback)

      expect(result).toBe(false)
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Location Permission Required',
        'Location permission has been permanently denied. Please enable it in your device settings to use location features.',
        expect.any(Array)
      )
    })
  })

  describe('Geocoding', () => {
    it('should geocode address successfully', async () => {
      const mockGeocodingResult = [
        {
          latitude: -0.3476,
          longitude: 32.5825,
          altitude: 1200,
          accuracy: 10
        }
      ]

      mockLocation.geocodeAsync.mockResolvedValue(mockGeocodingResult)

      const result = await locationService.geocodeAddress('Kampala, Uganda')

      expect(result).toEqual([{
        latitude: -0.3476,
        longitude: 32.5825,
        altitude: 1200,
        accuracy: 10,
        timestamp: expect.any(Number)
      }])

      expect(mockLocation.geocodeAsync).toHaveBeenCalledWith('Kampala, Uganda')
    })

    it('should handle geocoding errors', async () => {
      mockLocation.geocodeAsync.mockRejectedValue(new Error('Geocoding failed'))

      const result = await locationService.geocodeAddress('Invalid Address')

      expect(result).toEqual([])
    })
  })

  describe('Reverse Geocoding', () => {
    it('should reverse geocode coordinates successfully', async () => {
      const mockReverseGeocodingResult = [
        {
          name: 'Kampala',
          street: 'Main Street',
          city: 'Kampala',
          region: 'Central Region',
          country: 'Uganda',
          postalCode: '12345',
          isoCountryCode: 'UG'
        }
      ]

      mockLocation.reverseGeocodeAsync.mockResolvedValue(mockReverseGeocodingResult)

      const result = await locationService.reverseGeocode(-0.3476, 32.5825)

      expect(result).toBe('Kampala, Main Street, Kampala, Central Region, Uganda')
      expect(mockLocation.reverseGeocodeAsync).toHaveBeenCalledWith({
        latitude: -0.3476,
        longitude: 32.5825
      })
    })

    it('should handle empty reverse geocoding result', async () => {
      mockLocation.reverseGeocodeAsync.mockResolvedValue([])

      const result = await locationService.reverseGeocode(-0.3476, 32.5825)

      expect(result).toBeNull()
    })

    it('should handle reverse geocoding errors', async () => {
      mockLocation.reverseGeocodeAsync.mockRejectedValue(new Error('Reverse geocoding failed'))

      const result = await locationService.reverseGeocode(-0.3476, 32.5825)

      expect(result).toBeNull()
    })
  })

  describe('Distance Calculations', () => {
    it('should calculate distance between two points', () => {
      // Distance between Kampala and Entebbe (approximately 35km)
      const kampalaLat = -0.3476
      const kampalaLon = 32.5825
      const entebbeeLat = -0.0647
      const entebbeeLon = 32.4435

      const distance = locationService.calculateDistance(
        kampalaLat, kampalaLon, entebbeeLat, entebbeeLon
      )

      // Should be approximately 35,000 meters (35km)
      expect(distance).toBeGreaterThan(30000)
      expect(distance).toBeLessThan(40000)
    })

    it('should check if location is within radius', () => {
      const centerLat = -0.3476
      const centerLon = 32.5825
      const testLat = -0.3480 // Very close point
      const testLon = 32.5830

      const isWithin = locationService.isLocationWithinRadius(
        testLat, testLon, centerLat, centerLon, 1000 // 1km radius
      )

      expect(isWithin).toBe(true)
    })

    it('should check if location is outside radius', () => {
      const centerLat = -0.3476
      const centerLon = 32.5825
      const testLat = -0.0647 // Entebbe (far point)
      const testLon = 32.4435

      const isWithin = locationService.isLocationWithinRadius(
        testLat, testLon, centerLat, centerLon, 1000 // 1km radius
      )

      expect(isWithin).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle location timeout error', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(true)

      const error = new Error('Location timeout')
      ;(error as any).code = 'E_LOCATION_TIMEOUT'
      mockLocation.getCurrentPositionAsync.mockRejectedValue(error)

      const result = await locationService.getCurrentLocation()

      expect(result).toBeNull()
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Location Error',
        'Location request timed out. Please check your GPS signal and try again.'
      )
    })

    it('should handle location unavailable error', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never'
      })
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(true)

      const error = new Error('Location unavailable')
      ;(error as any).code = 'E_LOCATION_UNAVAILABLE'
      mockLocation.getCurrentPositionAsync.mockRejectedValue(error)

      const result = await locationService.getCurrentLocation()

      expect(result).toBeNull()
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Location Error',
        'Location is currently unavailable. Please try again later.'
      )
    })
  })

  describe('Fallback Handling', () => {
    it('should handle location fallback with alternative action', async () => {
      const alternativeAction = jest.fn()

      await locationService.handleLocationFallback({
        showError: true,
        errorMessage: 'Custom location error',
        alternativeAction
      })

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Location Unavailable',
        'Custom location error',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Manual Entry' }),
          expect.objectContaining({ text: 'OK' })
        ])
      )
    })

    it('should handle location fallback without showing error', async () => {
      await locationService.handleLocationFallback({
        showError: false
      })

      expect(mockAlert.alert).not.toHaveBeenCalled()
    })
  })
})