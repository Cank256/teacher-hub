/**
 * Verification Badge Component
 * Displays official verification badges for government content
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { VerificationBadgeProps } from '../types';
import { BadgeType, GovernmentSource } from '../../../types';
import { useTheme } from '../../../theme';

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  badge,
  size = 'medium',
  showText = true,
  style,
}) => {
  const { colors, typography } = useTheme();

  const getBadgeConfig = () => {
    switch (badge.badgeType) {
      case BadgeType.OFFICIAL:
        return {
          backgroundColor: colors.success,
          icon: '✓',
          text: 'Official',
          textColor: colors.white,
        };
      case BadgeType.VERIFIED:
        return {
          backgroundColor: colors.primary,
          icon: '✓',
          text: 'Verified',
          textColor: colors.white,
        };
      case BadgeType.ENDORSED:
        return {
          backgroundColor: colors.warning,
          icon: '★',
          text: 'Endorsed',
          textColor: colors.white,
        };
      case BadgeType.DRAFT:
        return {
          backgroundColor: colors.neutral.light,
          icon: '◐',
          text: 'Draft',
          textColor: colors.text.secondary,
        };
      default:
        return {
          backgroundColor: colors.neutral.light,
          icon: '?',
          text: 'Unknown',
          textColor: colors.text.secondary,
        };
    }
  };

  const getSourceText = () => {
    switch (badge.verifiedBy) {
      case GovernmentSource.UNEB:
        return 'UNEB';
      case GovernmentSource.NCDC:
        return 'NCDC';
      case GovernmentSource.MINISTRY_OF_EDUCATION:
        return 'MoES';
      case GovernmentSource.DISTRICT_EDUCATION_OFFICE:
        return 'DEO';
      case GovernmentSource.SCHOOL_INSPECTION:
        return 'Inspection';
      case GovernmentSource.TEACHER_SERVICE_COMMISSION:
        return 'TSC';
      default:
        return 'Gov';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
          icon: { fontSize: 10 },
          text: { fontSize: 10 },
        };
      case 'large':
        return {
          container: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
          icon: { fontSize: 16 },
          text: { fontSize: 14 },
        };
      default: // medium
        return {
          container: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
          icon: { fontSize: 12 },
          text: { fontSize: 12 },
        };
    }
  };

  const badgeConfig = getBadgeConfig();
  const sizeStyles = getSizeStyles();

  if (!badge.isVerified) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        sizeStyles.container,
        { backgroundColor: badgeConfig.backgroundColor },
        style,
      ]}
    >
      <Text
        style={[
          styles.icon,
          sizeStyles.icon,
          { color: badgeConfig.textColor },
        ]}
      >
        {badgeConfig.icon}
      </Text>
      {showText && (
        <Text
          style={[
            styles.text,
            sizeStyles.text,
            { color: badgeConfig.textColor },
          ]}
        >
          {badgeConfig.text} • {getSourceText()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  icon: {
    fontWeight: 'bold',
  },
  text: {
    marginLeft: 4,
    fontWeight: '600',
  },
});