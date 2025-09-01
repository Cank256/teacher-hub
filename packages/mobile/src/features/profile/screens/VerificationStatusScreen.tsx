import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { profileService } from '@/services/api/profileService';
import type { ProfileStackScreenProps } from '@/navigation/types';
import {
  Text,
  Card,
  Button,
  Loading,
  VerificationStatus,
} from '@/components/ui';

type Props = ProfileStackScreenProps<'VerificationStatus'>;

export const VerificationStatusScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user } = useAuth();

  // Fetch verification details
  const {
    data: verificationDetails,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['verificationDetails'],
    queryFn: profileService.getVerificationDetails,
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const handleResubmit = () => {
    // Navigate to credential verification screen
    navigation.navigate('Auth', {
      screen: 'VerifyCredentials',
      params: { userId: user?.id || '' },
    });
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'verified':
      case 'approved':
        return theme.colors.success;
      case 'rejected':
      case 'failed':
        return theme.colors.error;
      case 'pending':
      case 'under_review':
      default:
        return theme.colors.warning;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'verified':
      case 'approved':
        return '✓';
      case 'rejected':
      case 'failed':
        return '✗';
      case 'pending':
      case 'under_review':
      default:
        return '⏳';
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Loading size="large" />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading verification status...
        </Text>
      </View>
    );
  }

  if (error || !verificationDetails) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          Failed to load verification status
        </Text>
        <Button
          title="Retry"
          onPress={() => refetch()}
          variant="outline"
          style={styles.retryButton}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={theme.colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Main Status */}
      <VerificationStatus
        status={user?.verificationStatus}
        submittedAt={verificationDetails.submittedAt ? new Date(verificationDetails.submittedAt) : undefined}
        reviewedAt={verificationDetails.reviewedAt ? new Date(verificationDetails.reviewedAt) : undefined}
        feedback={verificationDetails.feedback}
        showProgress
      />

      {/* Documents Status */}
      {verificationDetails.documents && verificationDetails.documents.length > 0 && (
        <Card style={styles.documentsCard}>
          <Text
            style={[
              styles.sectionTitle,
              {
                fontSize: theme.typography.fontSize.lg,
                fontFamily: theme.typography.fontFamily.semibold,
                color: theme.colors.text,
              },
            ]}
          >
            Submitted Documents
          </Text>

          {verificationDetails.documents.map((document) => (
            <View
              key={document.id}
              style={[
                styles.documentItem,
                { borderBottomColor: theme.colors.borderLight },
              ]}
            >
              <View style={styles.documentInfo}>
                <Text
                  style={[
                    styles.documentType,
                    {
                      fontSize: theme.typography.fontSize.md,
                      fontFamily: theme.typography.fontFamily.medium,
                      color: theme.colors.text,
                    },
                  ]}
                >
                  {document.type.replace('_', ' ').toUpperCase()}
                </Text>
                <Text
                  style={[
                    styles.documentDate,
                    {
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                    },
                  ]}
                >
                  Uploaded: {formatDate(document.uploadedAt)}
                </Text>
              </View>
              
              <View style={styles.documentStatus}>
                <Text
                  style={[
                    styles.statusIcon,
                    { color: getStatusColor(document.status) },
                  ]}
                >
                  {getStatusIcon(document.status)}
                </Text>
                <Text
                  style={[
                    styles.statusText,
                    {
                      fontSize: theme.typography.fontSize.sm,
                      color: getStatusColor(document.status),
                      fontFamily: theme.typography.fontFamily.medium,
                    },
                  ]}
                >
                  {document.status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Timeline */}
      <Card style={styles.timelineCard}>
        <Text
          style={[
            styles.sectionTitle,
            {
              fontSize: theme.typography.fontSize.lg,
              fontFamily: theme.typography.fontFamily.semibold,
              color: theme.colors.text,
            },
          ]}
        >
          Verification Timeline
        </Text>

        <View style={styles.timeline}>
          {verificationDetails.submittedAt && (
            <View style={styles.timelineItem}>
              <View
                style={[
                  styles.timelineDot,
                  { backgroundColor: theme.colors.success },
                ]}
              />
              <View style={styles.timelineContent}>
                <Text
                  style={[
                    styles.timelineTitle,
                    {
                      fontSize: theme.typography.fontSize.md,
                      fontFamily: theme.typography.fontFamily.medium,
                      color: theme.colors.text,
                    },
                  ]}
                >
                  Documents Submitted
                </Text>
                <Text
                  style={[
                    styles.timelineDate,
                    {
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                    },
                  ]}
                >
                  {formatDate(verificationDetails.submittedAt)}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.timelineItem}>
            <View
              style={[
                styles.timelineDot,
                {
                  backgroundColor: verificationDetails.reviewedAt
                    ? theme.colors.success
                    : theme.colors.warning,
                },
              ]}
            />
            <View style={styles.timelineContent}>
              <Text
                style={[
                  styles.timelineTitle,
                  {
                    fontSize: theme.typography.fontSize.md,
                    fontFamily: theme.typography.fontFamily.medium,
                    color: theme.colors.text,
                  },
                ]}
              >
                {verificationDetails.reviewedAt ? 'Review Completed' : 'Under Review'}
              </Text>
              {verificationDetails.reviewedAt ? (
                <Text
                  style={[
                    styles.timelineDate,
                    {
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                    },
                  ]}
                >
                  {formatDate(verificationDetails.reviewedAt)}
                </Text>
              ) : (
                <Text
                  style={[
                    styles.timelineDate,
                    {
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                    },
                  ]}
                >
                  Your documents are being reviewed by our team
                </Text>
              )}
            </View>
          </View>
        </View>
      </Card>

      {/* Help & Support */}
      <Card style={styles.helpCard}>
        <Text
          style={[
            styles.sectionTitle,
            {
              fontSize: theme.typography.fontSize.lg,
              fontFamily: theme.typography.fontFamily.semibold,
              color: theme.colors.text,
            },
          ]}
        >
          Need Help?
        </Text>

        <Text
          style={[
            styles.helpText,
            {
              fontSize: theme.typography.fontSize.md,
              color: theme.colors.textSecondary,
              lineHeight: 22,
            },
          ]}
        >
          If you have questions about your verification status or need to update your documents, 
          you can resubmit your credentials or contact our support team.
        </Text>

        <View style={styles.helpActions}>
          <Button
            title="Resubmit Documents"
            onPress={handleResubmit}
            variant="outline"
            style={styles.helpButton}
          />
          
          <TouchableOpacity
            style={[
              styles.contactButton,
              { borderColor: theme.colors.border },
            ]}
            onPress={() => {
              // TODO: Implement contact support
            }}
          >
            <Text
              style={[
                styles.contactText,
                {
                  fontSize: theme.typography.fontSize.md,
                  color: theme.colors.primary,
                },
              ]}
            >
              Contact Support
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 8,
  },
  documentsCard: {
    marginBottom: 16,
    padding: 20,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  documentInfo: {
    flex: 1,
  },
  documentType: {
    marginBottom: 2,
  },
  documentDate: {
    lineHeight: 18,
  },
  documentStatus: {
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  statusText: {
    textAlign: 'center',
  },
  timelineCard: {
    marginBottom: 16,
    padding: 20,
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 16,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    marginBottom: 2,
  },
  timelineDate: {
    lineHeight: 18,
  },
  helpCard: {
    padding: 20,
  },
  helpText: {
    marginBottom: 20,
  },
  helpActions: {
    gap: 12,
  },
  helpButton: {
    alignSelf: 'stretch',
  },
  contactButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  contactText: {
    fontWeight: '500',
  },
});