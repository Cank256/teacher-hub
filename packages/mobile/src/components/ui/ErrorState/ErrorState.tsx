import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '@/theme';

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  icon?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  onRetry,
  retryText = 'Try Again',
  icon = 'error-outline',
}) => {
  const { colors, spacing } = useTheme();

  return (
    <View style={styles.container}>
      <Icon name={icon} size={64} color={colors.text.secondary} />
      
      <Text style={[styles.title, { color: colors.text.primary }]}>
        {title}
      </Text>
      
      <Text style={[styles.message, { color: colors.text.secondary }]}>
        {message}
      </Text>
      
      {onRetry && (
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={onRetry}
        >
          <Text style={[styles.retryButtonText, { color: colors.background.primary }]}>
            {retryText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});