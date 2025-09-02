import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { AppState, AppStateStatus } from 'react-native';
import { AppLockConfig } from './types';
import { DataEncryptionService } from './DataEncryptionService';

export class AppLockService {
  private static instance: AppLockService;
  private isLocked: boolean = false;
  private lockTimeout: NodeJS.Timeout | null = null;
  private backgroundTime: number = 0;
  private failedAttempts: number = 0;
  private lockoutEndTime: number = 0;
  private appStateSubscription: any = null;
  
  private config: AppLockConfig = {
    enabled: false,
    biometricsEnabled: false,
    lockTimeout: 5 * 60 * 1000, // 5 minutes
    maxFailedAttempts: 5,
    lockoutDuration: 30 * 60 * 1000 // 30 minutes
  };

  public static getInstance(): AppLockService {
    if (!AppLockService.instance) {
      AppLockService.instance = new AppLockService();
    }
    return AppLockService.instance;
  }

  /**
   * Initializes the app lock service
   */
  public async initialize(): Promise<void> {
    try {
      await this.loadConfig();
      this.setupAppStateListener();
      
      if (this.config.enabled) {
        await this.checkInitialLockState();
      }
    } catch (error) {
      console.error('Failed to initialize app lock service:', error);
    }
  }

  /**
   * Enables app lock with specified configuration
   */
  public async enableAppLock(config: Partial<AppLockConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...config, enabled: true };
      await this.saveConfig();
      
      if (config.biometricsEnabled) {
        const biometricsAvailable = await this.checkBiometricsAvailability();
        if (!biometricsAvailable) {
          throw new Error('Biometrics not available on this device');
        }
      }
      
      this.setupAppStateListener();
    } catch (error) {
      console.error('Failed to enable app lock:', error);
      throw error;
    }
  }

  /**
   * Disables app lock
   */
  public async disableAppLock(): Promise<void> {
    try {
      this.config.enabled = false;
      await this.saveConfig();
      this.clearLockTimeout();
      this.removeAppStateListener();
      this.isLocked = false;
    } catch (error) {
      console.error('Failed to disable app lock:', error);
      throw error;
    }
  }

  /**
   * Locks the app immediately
   */
  public lockApp(): void {
    this.isLocked = true;
    this.clearLockTimeout();
  }

  /**
   * Attempts to unlock the app using biometrics or passcode
   */
  public async unlockApp(useBiometrics: boolean = true): Promise<boolean> {
    try {
      // Check if app is in lockout period
      if (this.isInLockout()) {
        const remainingTime = Math.ceil((this.lockoutEndTime - Date.now()) / 1000 / 60);
        throw new Error(`App is locked. Try again in ${remainingTime} minutes.`);
      }

      let authResult = false;

      if (useBiometrics && this.config.biometricsEnabled) {
        authResult = await this.authenticateWithBiometrics();
      } else {
        // For passcode authentication, you would implement a passcode input UI
        // For now, we'll assume biometric authentication
        authResult = await this.authenticateWithBiometrics();
      }

      if (authResult) {
        this.isLocked = false;
        this.failedAttempts = 0;
        this.startLockTimer();
        return true;
      } else {
        this.handleFailedAttempt();
        return false;
      }
    } catch (error) {
      console.error('Unlock attempt failed:', error);
      this.handleFailedAttempt();
      throw error;
    }
  }

  /**
   * Checks if the app is currently locked
   */
  public isAppLocked(): boolean {
    return this.config.enabled && this.isLocked;
  }

  /**
   * Gets the current app lock configuration
   */
  public getConfig(): AppLockConfig {
    return { ...this.config };
  }

  /**
   * Updates app lock configuration
   */
  public async updateConfig(newConfig: Partial<AppLockConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...newConfig };
      await this.saveConfig();
      
      if (this.config.enabled) {
        this.setupAppStateListener();
        this.startLockTimer();
      } else {
        this.removeAppStateListener();
        this.clearLockTimeout();
      }
    } catch (error) {
      console.error('Failed to update app lock config:', error);
      throw error;
    }
  }

  /**
   * Checks if biometrics are available and enrolled
   */
  private async checkBiometricsAvailability(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      return hasHardware && isEnrolled && supportedTypes.length > 0;
    } catch (error) {
      console.error('Biometrics availability check failed:', error);
      return false;
    }
  }

  /**
   * Authenticates user using biometrics
   */
  private async authenticateWithBiometrics(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Teacher Hub',
        subtitle: 'Use your biometric to unlock the app',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        requireConfirmation: false
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  /**
   * Sets up app state listener to handle background/foreground transitions
   */
  private setupAppStateListener(): void {
    if (this.appStateSubscription) {
      return;
    }

    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  /**
   * Removes app state listener
   */
  private removeAppStateListener(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  /**
   * Handles app state changes (background/foreground)
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (!this.config.enabled) {
      return;
    }

    if (nextAppState === 'background' || nextAppState === 'inactive') {
      this.backgroundTime = Date.now();
      this.clearLockTimeout();
    } else if (nextAppState === 'active') {
      const timeInBackground = Date.now() - this.backgroundTime;
      
      if (timeInBackground > this.config.lockTimeout) {
        this.lockApp();
      } else {
        this.startLockTimer();
      }
    }
  }

  /**
   * Starts the auto-lock timer
   */
  private startLockTimer(): void {
    this.clearLockTimeout();
    
    if (this.config.enabled && this.config.lockTimeout > 0) {
      this.lockTimeout = setTimeout(() => {
        this.lockApp();
      }, this.config.lockTimeout);
    }
  }

  /**
   * Clears the auto-lock timer
   */
  private clearLockTimeout(): void {
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout);
      this.lockTimeout = null;
    }
  }

  /**
   * Handles failed unlock attempts
   */
  private handleFailedAttempt(): void {
    this.failedAttempts++;
    
    if (this.failedAttempts >= this.config.maxFailedAttempts) {
      this.lockoutEndTime = Date.now() + this.config.lockoutDuration;
      this.failedAttempts = 0;
    }
  }

  /**
   * Checks if app is in lockout period
   */
  private isInLockout(): boolean {
    return Date.now() < this.lockoutEndTime;
  }

  /**
   * Checks initial lock state on app startup
   */
  private async checkInitialLockState(): Promise<void> {
    try {
      // Check if app was closed while locked
      const wasLocked = await this.getStoredLockState();
      if (wasLocked) {
        this.isLocked = true;
      }
    } catch (error) {
      console.error('Failed to check initial lock state:', error);
      // Default to locked state for security
      this.isLocked = true;
    }
  }

  /**
   * Loads configuration from secure storage
   */
  private async loadConfig(): Promise<void> {
    try {
      const encryptionService = DataEncryptionService.getInstance();
      const storedConfig = await encryptionService.decryptFromSecureStorage('app_lock_config');
      
      if (storedConfig) {
        this.config = { ...this.config, ...storedConfig };
      }
    } catch (error) {
      console.error('Failed to load app lock config:', error);
      // Use default config
    }
  }

  /**
   * Saves configuration to secure storage
   */
  private async saveConfig(): Promise<void> {
    try {
      const encryptionService = DataEncryptionService.getInstance();
      await encryptionService.encryptForSecureStorage('app_lock_config', this.config);
    } catch (error) {
      console.error('Failed to save app lock config:', error);
      throw error;
    }
  }

  /**
   * Gets stored lock state
   */
  private async getStoredLockState(): Promise<boolean> {
    try {
      const lockState = await SecureStore.getItemAsync('app_lock_state');
      return lockState === 'true';
    } catch (error) {
      console.error('Failed to get stored lock state:', error);
      return true; // Default to locked for security
    }
  }

  /**
   * Stores lock state
   */
  private async storeLockState(isLocked: boolean): Promise<void> {
    try {
      await SecureStore.setItemAsync('app_lock_state', isLocked.toString());
    } catch (error) {
      console.error('Failed to store lock state:', error);
    }
  }

  /**
   * Resets all lock-related data
   */
  public async reset(): Promise<void> {
    try {
      this.isLocked = false;
      this.failedAttempts = 0;
      this.lockoutEndTime = 0;
      this.clearLockTimeout();
      this.removeAppStateListener();
      
      await SecureStore.deleteItemAsync('app_lock_config');
      await SecureStore.deleteItemAsync('app_lock_state');
      
      this.config = {
        enabled: false,
        biometricsEnabled: false,
        lockTimeout: 5 * 60 * 1000,
        maxFailedAttempts: 5,
        lockoutDuration: 30 * 60 * 1000
      };
    } catch (error) {
      console.error('Failed to reset app lock service:', error);
      throw error;
    }
  }

  /**
   * Gets remaining lockout time in seconds
   */
  public getRemainingLockoutTime(): number {
    if (!this.isInLockout()) {
      return 0;
    }
    return Math.ceil((this.lockoutEndTime - Date.now()) / 1000);
  }

  /**
   * Gets number of failed attempts
   */
  public getFailedAttempts(): number {
    return this.failedAttempts;
  }
}