/**
 * Location Service
 * 
 * Handles location services integration with privacy controls,
 * permission management, and graceful fallbacks.
 */

// @ts-ignore - expo-location types may not be available in development environment
import * as Location from 'expo-location'
import { Alert, Platform } from 'react-native'
import {
  LocationOptions,
  LocationResult,
  LocationPermissionStatus,
  PermissionResult,
  FallbackOptions,
  NativeModuleError
} from './types'

export class LocationService {
  private static instance: LocationService
  private watchSubscription: Location.LocationSubscription | null = null

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService()
    }
    return LocationService.instance
  }

  /**
   * Request location permissions with user-friendly rationale
   */
  async requestLocationPermission(background: boolean = false): Promise<PermissionResult> {
    try {
      // Request foreground permission first
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync()

      if (status !== 'granted') {
        return {
          granted: false,
          canAskAgain,
          status: status as any
        }
      }

      // Request background permission if needed
      if (background) {
        const backgroundResult = await Location.requestBackgroundPermissionsAsync()
        return {
          granted: backgroundResult.status === 'granted',
          canAskAgain: backgroundResult.canAskAgain,
          status: backgroundResult.status as any
        }
      }

      return {
        granted: true,
        canAskAgain,
        status: 'granted'
      }
    } catch (error) {
      console.error('Error requesting location permission:', error)
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied'
      }
    }
  }

  /**
   * Get current location permission status
   */
  async getLocationPermissionStatus(): Promise<LocationPermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync()

      return {
        granted: status === 'granted',
        canAskAgain,
        status: status as any
      }
    } catch (error) {
      console.error('Error getting location permission status:', error)
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied'
      }
    }
  }

  /**
   * Check if location services are enabled on the device
   */
  async isLocationEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync()
    } catch (error) {
      console.error('Error checking location services:', error)
      return false
    }
  }

  /**
   * Get current location with privacy controls
   */
  async getCurrentLocation(options: LocationOptions = { accuracy: 'balanced' }): Promise<LocationResult | null> {
    try {
      // Check permissions first
      const permission = await this.requestLocationPermission()
      if (!permission.granted) {
        this.handlePermissionDenied(permission.canAskAgain)
        return null
      }

      // Check if location services are enabled
      const isEnabled = await this.isLocationEnabled()
      if (!isEnabled) {
        this.handleLocationServicesDisabled()
        return null
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: this.mapAccuracy(options.accuracy),
        maximumAge: options.maximumAge,
        timeout: options.timeout ?? 15000
      })

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude ?? undefined,
        accuracy: location.coords.accuracy ?? undefined,
        speed: location.coords.speed ?? undefined,
        heading: location.coords.heading ?? undefined,
        timestamp: location.timestamp
      }
    } catch (error) {
      this.handleLocationError(error as NativeModuleError)
      return null
    }
  }

  /**
   * Watch location changes with privacy controls
   */
  async watchLocation(
    callback: (location: LocationResult) => void,
    options: LocationOptions = { accuracy: 'balanced' }
  ): Promise<boolean> {
    try {
      // Check permissions first
      const permission = await this.requestLocationPermission()
      if (!permission.granted) {
        this.handlePermissionDenied(permission.canAskAgain)
        return false
      }

      // Stop existing watch if any
      await this.stopWatchingLocation()

      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: this.mapAccuracy(options.accuracy),
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10 // Update every 10 meters
        },
        (location: Location.LocationObject) => {
          const result: LocationResult = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude ?? undefined,
            accuracy: location.coords.accuracy ?? undefined,
            speed: location.coords.speed ?? undefined,
            heading: location.coords.heading ?? undefined,
            timestamp: location.timestamp
          }
          callback(result)
        }
      )

      return true
    } catch (error) {
      this.handleLocationError(error as NativeModuleError)
      return false
    }
  }

  /**
   * Stop watching location changes
   */
  async stopWatchingLocation(): Promise<void> {
    if (this.watchSubscription) {
      this.watchSubscription.remove()
      this.watchSubscription = null
    }
  }

  /**
   * Get location from address (geocoding)
   */
  async geocodeAddress(address: string): Promise<LocationResult[]> {
    try {
      const locations = await Location.geocodeAsync(address)

      return locations.map((location: Location.LocationGeocodedAddress) => ({
        latitude: location.latitude,
        longitude: location.longitude,
        altitude: location.altitude ?? undefined,
        accuracy: location.accuracy ?? undefined,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error('Error geocoding address:', error)
      return []
    }
  }

  /**
   * Get address from location (reverse geocoding)
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude })

      if (addresses.length > 0) {
        const address = addresses[0]
        const parts = [
          address.name,
          address.street,
          address.city,
          address.region,
          address.country
        ].filter(Boolean)

        return parts.join(', ')
      }

      return null
    } catch (error) {
      console.error('Error reverse geocoding:', error)
      return null
    }
  }

  /**
   * Calculate distance between two locations (in meters)
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  /**
   * Check if location is within a certain radius of a point
   */
  isLocationWithinRadius(
    currentLat: number,
    currentLon: number,
    targetLat: number,
    targetLon: number,
    radiusMeters: number
  ): boolean {
    const distance = this.calculateDistance(currentLat, currentLon, targetLat, targetLon)
    return distance <= radiusMeters
  }

  /**
   * Handle graceful fallbacks when location is not available
   */
  async handleLocationFallback(fallbackOptions: FallbackOptions = {}): Promise<void> {
    const { showError = true, errorMessage, alternativeAction, retryAction } = fallbackOptions

    if (showError) {
      const message = errorMessage ?? 'Location services are not available. You can manually enter your location in settings.'

      Alert.alert(
        'Location Unavailable',
        message,
        [
          ...(alternativeAction ? [{
            text: 'Manual Entry',
            onPress: alternativeAction
          }] : []),
          ...(retryAction ? [{
            text: 'Retry',
            onPress: retryAction
          }] : []),
          {
            text: 'OK',
            style: 'cancel'
          }
        ]
      )
    }
  }

  // Private helper methods

  private mapAccuracy(accuracy: LocationOptions['accuracy']): Location.Accuracy {
    switch (accuracy) {
      case 'lowest':
        return Location.Accuracy.Lowest
      case 'low':
        return Location.Accuracy.Low
      case 'balanced':
        return Location.Accuracy.Balanced
      case 'high':
        return Location.Accuracy.High
      case 'highest':
        return Location.Accuracy.Highest
      default:
        return Location.Accuracy.Balanced
    }
  }

  private handlePermissionDenied(canAskAgain: boolean): void {
    const message = canAskAgain
      ? 'Location permission is required to use location-based features. Please grant permission to continue.'
      : 'Location permission has been permanently denied. Please enable it in your device settings to use location features.'

    Alert.alert(
      'Location Permission Required',
      message,
      [
        {
          text: 'OK',
          style: 'cancel'
        },
        ...(canAskAgain ? [] : [{
          text: 'Open Settings',
          onPress: () => {
            // In a real app, you might use Linking.openSettings()
            console.log('Open device settings')
          }
        }])
      ]
    )
  }

  private handleLocationServicesDisabled(): void {
    Alert.alert(
      'Location Services Disabled',
      'Location services are disabled on your device. Please enable them in your device settings to use location features.',
      [
        {
          text: 'OK',
          style: 'cancel'
        },
        {
          text: 'Open Settings',
          onPress: () => {
            // In a real app, you might use Linking.openSettings()
            console.log('Open location settings')
          }
        }
      ]
    )
  }

  private handleLocationError(error: NativeModuleError): void {
    console.error('Location error:', error)

    let message = 'An error occurred while getting your location. Please try again.'

    if (error.code === 'E_LOCATION_SERVICES_DISABLED') {
      message = 'Location services are disabled. Please enable them in your device settings.'
    } else if (error.code === 'E_LOCATION_TIMEOUT') {
      message = 'Location request timed out. Please check your GPS signal and try again.'
    } else if (error.code === 'E_LOCATION_UNAVAILABLE') {
      message = 'Location is currently unavailable. Please try again later.'
    }

    Alert.alert('Location Error', message)
  }
}

export default LocationService.getInstance()