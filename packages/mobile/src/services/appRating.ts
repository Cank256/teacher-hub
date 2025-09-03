import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking, Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';

interface RatingConfig {
  minSessionsBeforePrompt: number;
  minDaysBeforePrompt: number;
  daysAfterRemindMeLater: number;
  maxPromptsPerVersion: number;
}

interface RatingData {
  sessionCount: number;
  firstLaunchDate: string;
  lastPromptDate?: string;
  promptCount: number;
  hasRated: boolean;
  remindMeLaterDate?: string;
  appVersion: string;
}

const RATING_STORAGE_KEY = '@app_rating_data';
const APP_VERSION = '1.0.0'; // This should come from app config

const defaultConfig: RatingConfig = {
  minSessionsBeforePrompt: 10,
  minDaysBeforePrompt: 7,
  daysAfterRemindMeLater: 7,
  maxPromptsPerVersion: 3,
};

class AppRatingService {
  private config: RatingConfig;

  constructor(config: Partial<RatingConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  async incrementSessionCount(): Promise<void> {
    try {
      const data = await this.getRatingData();
      data.sessionCount += 1;
      await this.saveRatingData(data);
    } catch (error) {
      console.warn('Failed to increment session count:', error);
    }
  }

  async shouldShowRatingPrompt(): Promise<boolean> {
    try {
      const data = await this.getRatingData();

      // Don't show if user has already rated
      if (data.hasRated) {
        return false;
      }

      // Don't show if we've reached max prompts for this version
      if (data.promptCount >= this.config.maxPromptsPerVersion) {
        return false;
      }

      // Check minimum sessions
      if (data.sessionCount < this.config.minSessionsBeforePrompt) {
        return false;
      }

      // Check minimum days since first launch
      const daysSinceFirstLaunch = this.getDaysDifference(
        new Date(data.firstLaunchDate),
        new Date()
      );
      if (daysSinceFirstLaunch < this.config.minDaysBeforePrompt) {
        return false;
      }

      // Check if user selected "Remind me later"
      if (data.remindMeLaterDate) {
        const daysSinceReminder = this.getDaysDifference(
          new Date(data.remindMeLaterDate),
          new Date()
        );
        if (daysSinceReminder < this.config.daysAfterRemindMeLater) {
          return false;
        }
      }

      // Check if we've prompted recently
      if (data.lastPromptDate) {
        const daysSinceLastPrompt = this.getDaysDifference(
          new Date(data.lastPromptDate),
          new Date()
        );
        if (daysSinceLastPrompt < this.config.daysAfterRemindMeLater) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.warn('Failed to check rating prompt eligibility:', error);
      return false;
    }
  }

  async showRatingPrompt(): Promise<void> {
    try {
      const data = await this.getRatingData();
      data.promptCount += 1;
      data.lastPromptDate = new Date().toISOString();
      await this.saveRatingData(data);

      // Try native store review first (iOS 10.3+ and Android)
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview();
        return;
      }

      // Fallback to custom dialog
      this.showCustomRatingDialog();
    } catch (error) {
      console.warn('Failed to show rating prompt:', error);
      this.showCustomRatingDialog();
    }
  }

  private showCustomRatingDialog(): void {
    Alert.alert(
      'Enjoying Teacher Hub?',
      'Your feedback helps us improve the app for all teachers. Would you like to rate us?',
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: () => this.handleNotNow(),
        },
        {
          text: 'Remind Me Later',
          onPress: () => this.handleRemindLater(),
        },
        {
          text: 'Rate App',
          onPress: () => this.handleRateApp(),
        },
      ]
    );
  }

  private async handleNotNow(): Promise<void> {
    // User declined, don't ask again for this version
    const data = await this.getRatingData();
    data.promptCount = this.config.maxPromptsPerVersion;
    await this.saveRatingData(data);
  }

  private async handleRemindLater(): Promise<void> {
    const data = await this.getRatingData();
    data.remindMeLaterDate = new Date().toISOString();
    await this.saveRatingData(data);
  }

  private async handleRateApp(): Promise<void> {
    try {
      const data = await this.getRatingData();
      data.hasRated = true;
      await this.saveRatingData(data);

      // Open app store
      const storeUrl = Platform.select({
        ios: 'https://apps.apple.com/app/teacher-hub/id123456789', // Replace with actual App Store ID
        android: 'https://play.google.com/store/apps/details?id=com.teacherhub.mobile', // Replace with actual package name
      });

      if (storeUrl) {
        await Linking.openURL(storeUrl);
      }
    } catch (error) {
      console.warn('Failed to open app store:', error);
    }
  }

  async showFeedbackPrompt(): Promise<void> {
    Alert.alert(
      'Send Feedback',
      'Help us improve Teacher Hub by sharing your thoughts and suggestions.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send Feedback',
          onPress: () => this.openFeedbackForm(),
        },
      ]
    );
  }

  private async openFeedbackForm(): Promise<void> {
    try {
      const emailUrl = 'mailto:feedback@teacherhub.ug?subject=Teacher Hub Mobile Feedback';
      await Linking.openURL(emailUrl);
    } catch (error) {
      console.warn('Failed to open feedback form:', error);
    }
  }

  private async getRatingData(): Promise<RatingData> {
    try {
      const stored = await AsyncStorage.getItem(RATING_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as RatingData;
        
        // Reset data if app version changed
        if (data.appVersion !== APP_VERSION) {
          return this.createInitialRatingData();
        }
        
        return data;
      }
    } catch (error) {
      console.warn('Failed to get rating data:', error);
    }

    return this.createInitialRatingData();
  }

  private createInitialRatingData(): RatingData {
    return {
      sessionCount: 0,
      firstLaunchDate: new Date().toISOString(),
      promptCount: 0,
      hasRated: false,
      appVersion: APP_VERSION,
    };
  }

  private async saveRatingData(data: RatingData): Promise<void> {
    try {
      await AsyncStorage.setItem(RATING_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save rating data:', error);
    }
  }

  private getDaysDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Method to manually trigger rating prompt (for testing or manual triggers)
  async forceShowRatingPrompt(): Promise<void> {
    await this.showRatingPrompt();
  }

  // Reset rating data (useful for testing)
  async resetRatingData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(RATING_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to reset rating data:', error);
    }
  }
}

export const appRatingService = new AppRatingService();
export { AppRatingService };