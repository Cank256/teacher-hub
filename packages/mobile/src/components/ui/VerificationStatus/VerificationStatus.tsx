import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useAnimatedProps,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeContext';
import { VerificationStatus as Status } from '@/types';
import Text from '../Text';
import Card from '../Card';

export interface VerificationStatusProps {
  status: Status;
  submittedAt?: Date;
  reviewedAt?: Date;
  feedback?: string;
  onViewDetails?: () => void;
  showProgress?: boolean;
  compact?: boolean;
}

const VerificationStatusComponent: React.FC<VerificationStatusProps> = ({
  status,
  submittedAt,
  reviewedAt,
  feedback,
  onViewDetails,
  showProgress = true,
  compact = false,
}) => {
  const { theme } = useTheme();
  const pulseAnimation = useSharedValue(1);

  // Animate pending status
  React.useEffect(() => {
    if (status === Status.PENDING) {
      pulseAnimation.value = withRepeat(
        withTiming(1.1, { duration: 1000 }),
        -1,
        true
      );
    } else {
      pulseAnimation.value = withTiming(1, { duration: 300 });
    }
  }, [status, pulseAnimation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
  }));

  const getStatusConfig = () => {
    switch (status) {
      case Status.VERIFIED:
        return {
          color: theme.colors.success,
          icon: '✓',
          title: 'Verified',
          description: 'Your credentials have been verified',
          backgroundColor: `${theme.colors.success}15`,
        };
      case Status.REJECTED:
        return {
          color: theme.colors.error,
          icon: '✗',
          title: 'Verification Failed',
          description: 'Your credentials need attention',
          backgroundColor: `${theme.colors.error}15`,
        };
      case Status.PENDING:
      default:
        return {
          color: theme.colors.warning,
          icon: '⏳',
          title: 'Pending Review',
          description: 'Your credentials are being reviewed',
          backgroundColor: `${theme.colors.warning}15`,
        };
    }
  };

  const statusConfig = getStatusConfig();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderProgressSteps = () => {
    if (!showProgress || compact) return null;

    const steps = [
      { label: 'Submitted', completed: !!submittedAt },
      { label: 'Under Review', completed: status !== Status.PENDING },
      { label: 'Completed', completed: status === Status.VERIFIED },
    ];

    return (
      <View style={styles.progressContainer}>
        {steps.map((step, index) => (
          <View key={step.label} style={styles.stepContainer}>
            <View style={styles.stepLine}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: step.completed
                      ? statusConfig.color
                      : theme.colors.border,
                  },
                ]}
              />
              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.stepConnector,
                    {
                      backgroundColor: steps[index + 1].completed
                        ? statusConfig.color
                        : theme.colors.border,
                    },
                  ]}
                />
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                {
                  color: step.completed
                    ? theme.colors.text
                    : theme.colors.textSecondary,
                  fontSize: theme.typography.fontSize.xs,
                },
              ]}
            >
              {step.label}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderCompactView = () => (
    <TouchableOpacity
      style={[
        styles.compactContainer,
        {
          backgroundColor: statusConfig.backgroundColor,
          borderColor: statusConfig.color,
          borderRadius: theme.borderRadius.md,
        },
      ]}
      onPress={onViewDetails}
      disabled={!onViewDetails}
    >
      <Animated.View style={[styles.compactIcon, animatedStyle]}>
        <Text style={[styles.iconText, { color: statusConfig.color }]}>
          {statusConfig.icon}
        </Text>
      </Animated.View>
      <View style={styles.compactContent}>
        <Text
          style={[
            styles.compactTitle,
            {
              color: statusConfig.color,
              fontFamily: theme.typography.fontFamily.semibold,
              fontSize: theme.typography.fontSize.sm,
            },
          ]}
        >
          {statusConfig.title}
        </Text>
        <Text
          style={[
            styles.compactDescription,
            {
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.xs,
            },
          ]}
        >
          {statusConfig.description}
        </Text>
      </View>
      {onViewDetails && (
        <Text style={[styles.arrow, { color: theme.colors.textSecondary }]}>
          ›
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderFullView = () => (
    <Card style={[styles.card, { backgroundColor: statusConfig.backgroundColor }]}>
      <View style={styles.header}>
        <Animated.View style={[styles.iconContainer, animatedStyle]}>
          <Text style={[styles.iconText, { color: statusConfig.color }]}>
            {statusConfig.icon}
          </Text>
        </Animated.View>
        <View style={styles.headerContent}>
          <Text
            style={[
              styles.title,
              {
                color: statusConfig.color,
                fontFamily: theme.typography.fontFamily.semibold,
                fontSize: theme.typography.fontSize.lg,
              },
            ]}
          >
            {statusConfig.title}
          </Text>
          <Text
            style={[
              styles.description,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.sm,
              },
            ]}
          >
            {statusConfig.description}
          </Text>
        </View>
      </View>

      {renderProgressSteps()}

      {/* Dates */}
      <View style={styles.datesContainer}>
        {submittedAt && (
          <View style={styles.dateItem}>
            <Text
              style={[
                styles.dateLabel,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.fontSize.xs,
                },
              ]}
            >
              Submitted:
            </Text>
            <Text
              style={[
                styles.dateValue,
                {
                  color: theme.colors.text,
                  fontSize: theme.typography.fontSize.xs,
                },
              ]}
            >
              {formatDate(submittedAt)}
            </Text>
          </View>
        )}
        {reviewedAt && (
          <View style={styles.dateItem}>
            <Text
              style={[
                styles.dateLabel,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.fontSize.xs,
                },
              ]}
            >
              Reviewed:
            </Text>
            <Text
              style={[
                styles.dateValue,
                {
                  color: theme.colors.text,
                  fontSize: theme.typography.fontSize.xs,
                },
              ]}
            >
              {formatDate(reviewedAt)}
            </Text>
          </View>
        )}
      </View>

      {/* Feedback */}
      {feedback && (
        <View
          style={[
            styles.feedbackContainer,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.sm,
            },
          ]}
        >
          <Text
            style={[
              styles.feedbackLabel,
              {
                color: theme.colors.text,
                fontFamily: theme.typography.fontFamily.medium,
                fontSize: theme.typography.fontSize.sm,
              },
            ]}
          >
            Feedback:
          </Text>
          <Text
            style={[
              styles.feedbackText,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.sm,
              },
            ]}
          >
            {feedback}
          </Text>
        </View>
      )}

      {/* Action Button */}
      {onViewDetails && (
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              borderColor: statusConfig.color,
              borderRadius: theme.borderRadius.md,
            },
          ]}
          onPress={onViewDetails}
        >
          <Text
            style={[
              styles.actionButtonText,
              {
                color: statusConfig.color,
                fontFamily: theme.typography.fontFamily.medium,
              },
            ]}
          >
            View Details
          </Text>
        </TouchableOpacity>
      )}
    </Card>
  );

  return compact ? renderCompactView() : renderFullView();
};

const styles = StyleSheet.create({
  // Compact view styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
  },
  compactIcon: {
    marginRight: 12,
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    marginBottom: 2,
  },
  compactDescription: {
    lineHeight: 16,
  },
  arrow: {
    fontSize: 18,
    marginLeft: 8,
  },

  // Full view styles
  card: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  iconText: {
    fontSize: 24,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    marginBottom: 4,
  },
  description: {
    lineHeight: 20,
  },

  // Progress styles
  progressContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
  },
  stepLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    height: 20,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepConnector: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
  },
  stepLabel: {
    textAlign: 'center',
    lineHeight: 16,
  },

  // Dates styles
  datesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    marginBottom: 2,
  },
  dateValue: {
    fontWeight: '500',
  },

  // Feedback styles
  feedbackContainer: {
    padding: 12,
    marginBottom: 16,
  },
  feedbackLabel: {
    marginBottom: 4,
  },
  feedbackText: {
    lineHeight: 20,
  },

  // Action button styles
  actionButton: {
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
  },
});

export default VerificationStatusComponent;