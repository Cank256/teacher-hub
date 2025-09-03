import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';

interface NetworkFallbackProps {
  children: React.ReactNode;
  onRetry?: () => void;
}

export const NetworkFallback: React.FC<NetworkFallbackProps> = ({
  children,
  onRetry,
}) => {
  const netInfo = useNetInfo();

  if (!netInfo.isConnected) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No Internet Connection</Text>
        <Text style={styles.message}>
          Please check your internet connection and try again.
        </Text>
        {onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});