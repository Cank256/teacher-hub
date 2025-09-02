/**
 * Notification Preferences Service
 * Manages user notification preferences and categories
 */

import { defaultStorage } from '../storage';
import { ApiClient } from '../api';
import {
    NotificationPreferences,
    NotificationCategory,
    NotificationCategorySettings,
    QuietHoursSettings
} from '../../types';

export class NotificationPreferencesService {
    private static instance: NotificationPreferencesService;
    private preferences: NotificationPreferences | null = null;

    static getInstance(): NotificationPreferencesService {
        if (!NotificationPreferencesService.instance) {
            NotificationPreferencesService.instance = new NotificationPreferencesService();
        }
        return NotificationPreferencesService.instance;
    }

    /**
     * Initialize preferences service
     */
    async initialize(): Promise<void> {
        try {
            await this.loadPreferences();
            console.log('Notification preferences service initialized');
        } catch (error) {
            console.error('Failed to initialize notification preferences service:', error);
            throw error;
        }
    }

    /**
     * Load preferences from storage
     */
    async loadPreferences(): Promise<NotificationPreferences> {
        try {
            // Try to load from local storage first
            let preferences = await defaultStorage.getItem<NotificationPreferences>('notificationPreferences');

            if (!preferences) {
                // Load from backend if available
                try {
                    const apiClient = ApiClient.getInstance();
                    const response = await apiClient.get('/notifications/preferences');
                    preferences = response.data;

                    // Save to local storage
                    if (preferences) {
                        await defaultStorage.setItem('notificationPreferences', preferences);
                    }
                } catch (error) {
                    console.warn('Failed to load preferences from backend:', error);
                }
            }

            if (!preferences) {
                // Create default preferences
                preferences = this.getDefaultPreferences();
                await this.savePreferences(preferences);
            }

            this.preferences = preferences;
            return preferences;
        } catch (error) {
            console.error('Failed to load notification preferences:', error);
            throw error;
        }
    }

    /**
     * Get default notification preferences
     */
    private getDefaultPreferences(): NotificationPreferences {
        return {
            messages: {
                enabled: true,
                sound: true,
                vibration: true,
                showPreview: true,
                priority: 'high',
            },
            posts: {
                enabled: true,
                sound: false,
                vibration: true,
                showPreview: true,
                priority: 'normal',
            },
            communities: {
                enabled: true,
                sound: false,
                vibration: false,
                showPreview: true,
                priority: 'normal',
            },
            government: {
                enabled: true,
                sound: true,
                vibration: true,
                showPreview: true,
                priority: 'high',
            },
            system: {
                enabled: true,
                sound: false,
                vibration: false,
                showPreview: false,
                priority: 'low',
            },
            quietHours: {
                enabled: false,
                startTime: '22:00',
                endTime: '07:00',
                allowCritical: true,
                allowMessages: false,
            },
            globalSettings: {
                enabled: true,
                showBadges: true,
                groupSimilar: true,
                smartDelivery: true,
            },
        };
    }

    /**
     * Save preferences to storage and backend
     */
    async savePreferences(preferences: NotificationPreferences): Promise<void> {
        try {
            // Save to local storage
            await defaultStorage.setItem('notificationPreferences', preferences);
            this.preferences = preferences;

            // Save to backend
            try {
                const apiClient = ApiClient.getInstance();
                await apiClient.put('/notifications/preferences', preferences);
                console.log('Notification preferences saved to backend');
            } catch (error) {
                console.warn('Failed to save preferences to backend:', error);
                // Don't throw - local save is more important
            }

            console.log('Notification preferences saved');
        } catch (error) {
            console.error('Failed to save notification preferences:', error);
            throw error;
        }
    }

    /**
     * Update category settings
     */
    async updateCategorySettings(
        category: NotificationCategory,
        settings: Partial<NotificationCategorySettings>
    ): Promise<void> {
        try {
            if (!this.preferences) {
                await this.loadPreferences();
            }

            if (!this.preferences) {
                throw new Error('Failed to load preferences');
            }

            // Update the specific category
            this.preferences[category] = {
                ...this.preferences[category],
                ...settings,
            };

            await this.savePreferences(this.preferences);
        } catch (error) {
            console.error('Failed to update category settings:', error);
            throw error;
        }
    }

    /**
     * Update quiet hours settings
     */
    async updateQuietHours(settings: Partial<QuietHoursSettings>): Promise<void> {
        try {
            if (!this.preferences) {
                await this.loadPreferences();
            }

            if (!this.preferences) {
                throw new Error('Failed to load preferences');
            }

            this.preferences.quietHours = {
                ...this.preferences.quietHours,
                ...settings,
            };

            await this.savePreferences(this.preferences);
        } catch (error) {
            console.error('Failed to update quiet hours:', error);
            throw error;
        }
    }

    /**
     * Enable/disable notifications for a category
     */
    async setCategoryEnabled(category: NotificationCategory, enabled: boolean): Promise<void> {
        await this.updateCategorySettings(category, { enabled });
    }

    /**
     * Enable/disable sound for a category
     */
    async setCategorySound(category: NotificationCategory, sound: boolean): Promise<void> {
        await this.updateCategorySettings(category, { sound });
    }

    /**
     * Enable/disable vibration for a category
     */
    async setCategoryVibration(category: NotificationCategory, vibration: boolean): Promise<void> {
        await this.updateCategorySettings(category, { vibration });
    }

    /**
     * Set priority for a category
     */
    async setCategoryPriority(
        category: NotificationCategory,
        priority: 'low' | 'normal' | 'high' | 'critical'
    ): Promise<void> {
        await this.updateCategorySettings(category, { priority });
    }

    /**
     * Enable/disable all notifications
     */
    async setGlobalEnabled(enabled: boolean): Promise<void> {
        try {
            if (!this.preferences) {
                await this.loadPreferences();
            }

            if (!this.preferences) {
                throw new Error('Failed to load preferences');
            }

            this.preferences.globalSettings.enabled = enabled;
            await this.savePreferences(this.preferences);
        } catch (error) {
            console.error('Failed to set global enabled:', error);
            throw error;
        }
    }

    /**
     * Check if notifications are enabled for a category
     */
    isCategoryEnabled(category: NotificationCategory): boolean {
        if (!this.preferences) {
            return false;
        }

        return this.preferences.globalSettings.enabled &&
            this.preferences[category]?.enabled === true;
    }

    /**
     * Check if sound is enabled for a category
     */
    isCategorySoundEnabled(category: NotificationCategory): boolean {
        if (!this.preferences || !this.isCategoryEnabled(category)) {
            return false;
        }

        return this.preferences[category]?.sound === true;
    }

    /**
     * Check if vibration is enabled for a category
     */
    isCategoryVibrationEnabled(category: NotificationCategory): boolean {
        if (!this.preferences || !this.isCategoryEnabled(category)) {
            return false;
        }

        return this.preferences[category]?.vibration === true;
    }

    /**
     * Check if we're in quiet hours
     */
    isInQuietHours(): boolean {
        if (!this.preferences || !this.preferences.quietHours.enabled) {
            return false;
        }

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const startTime = this.parseTime(this.preferences.quietHours.startTime);
        const endTime = this.parseTime(this.preferences.quietHours.endTime);

        // Handle overnight quiet hours (e.g., 22:00 to 07:00)
        if (startTime > endTime) {
            return currentTime >= startTime || currentTime <= endTime;
        } else {
            return currentTime >= startTime && currentTime <= endTime;
        }
    }

    /**
     * Parse time string to minutes
     */
    private parseTime(timeString: string): number {
        const parts = timeString.split(':');

        if (parts.length !== 2) {
            throw new Error(`Invalid time format: ${timeString}. Expected format: HH:MM`);
        }

        const hours = Number(parts[0]);
        const minutes = Number(parts[1]);

        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            throw new Error(`Invalid time values: ${timeString}. Hours must be 0-23, minutes must be 0-59`);
        }

        return hours * 60 + minutes;
    }

    /**
     * Check if notification should be delivered during quiet hours
     */
    shouldDeliverDuringQuietHours(
        category: NotificationCategory,
        priority?: 'low' | 'normal' | 'high' | 'critical'
    ): boolean {
        if (!this.preferences || !this.isInQuietHours()) {
            return true;
        }

        const quietHours = this.preferences.quietHours;

        // Always allow critical notifications if enabled
        if (priority === 'critical' && quietHours.allowCritical) {
            return true;
        }

        // Allow messages if enabled
        if (category === NotificationCategory.MESSAGE && quietHours.allowMessages) {
            return true;
        }

        // Block all other notifications during quiet hours
        return false;
    }

    /**
     * Get notification settings for a category
     */
    getCategorySettings(category: NotificationCategory): NotificationCategorySettings | null {
        if (!this.preferences) {
            return null;
        }

        return this.preferences[category] || null;
    }

    /**
     * Get all preferences
     */
    getPreferences(): NotificationPreferences | null {
        return this.preferences;
    }

    /**
     * Reset preferences to defaults
     */
    async resetToDefaults(): Promise<void> {
        try {
            const defaultPreferences = this.getDefaultPreferences();
            await this.savePreferences(defaultPreferences);
            console.log('Notification preferences reset to defaults');
        } catch (error) {
            console.error('Failed to reset preferences to defaults:', error);
            throw error;
        }
    }

    /**
     * Export preferences for backup
     */
    async exportPreferences(): Promise<string> {
        try {
            if (!this.preferences) {
                await this.loadPreferences();
            }

            return JSON.stringify(this.preferences, null, 2);
        } catch (error) {
            console.error('Failed to export preferences:', error);
            throw error;
        }
    }

    /**
     * Import preferences from backup
     */
    async importPreferences(preferencesJson: string): Promise<void> {
        try {
            const preferences = JSON.parse(preferencesJson) as NotificationPreferences;

            // Validate the structure
            if (!this.validatePreferences(preferences)) {
                throw new Error('Invalid preferences format');
            }

            await this.savePreferences(preferences);
            console.log('Notification preferences imported successfully');
        } catch (error) {
            console.error('Failed to import preferences:', error);
            throw error;
        }
    }

    /**
     * Validate preferences structure
     */
    private validatePreferences(preferences: any): preferences is NotificationPreferences {
        try {
            return (
                preferences &&
                typeof preferences === 'object' &&
                preferences.messages &&
                preferences.posts &&
                preferences.communities &&
                preferences.government &&
                preferences.system &&
                preferences.quietHours &&
                preferences.globalSettings
            );
        } catch (error) {
            return false;
        }
    }

    /**
     * Get notification summary for display
     */
    getNotificationSummary(): {
        totalEnabled: number;
        totalDisabled: number;
        soundEnabled: number;
        vibrationEnabled: number;
        quietHoursEnabled: boolean;
    } {
        if (!this.preferences) {
            return {
                totalEnabled: 0,
                totalDisabled: 0,
                soundEnabled: 0,
                vibrationEnabled: 0,
                quietHoursEnabled: false,
            };
        }

        const categories = [
            NotificationCategory.MESSAGE,
            NotificationCategory.POST,
            NotificationCategory.COMMUNITY,
            NotificationCategory.GOVERNMENT,
            NotificationCategory.SYSTEM,
        ];

        let totalEnabled = 0;
        let totalDisabled = 0;
        let soundEnabled = 0;
        let vibrationEnabled = 0;

        categories.forEach(category => {
            const settings = this.preferences![category];
            if (settings.enabled) {
                totalEnabled++;
                if (settings.sound) soundEnabled++;
                if (settings.vibration) vibrationEnabled++;
            } else {
                totalDisabled++;
            }
        });

        return {
            totalEnabled,
            totalDisabled,
            soundEnabled,
            vibrationEnabled,
            quietHoursEnabled: this.preferences.quietHours.enabled,
        };
    }
}

export const notificationPreferencesService = NotificationPreferencesService.getInstance();