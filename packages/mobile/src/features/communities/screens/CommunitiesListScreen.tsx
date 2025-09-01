import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '@/theme';
import { CommunityCard } from '@/components/communities/CommunityCard/CommunityCard';
import { CommunityFiltersComponent } from '@/components/communities/CommunityFilters/CommunityFilters';
import {
  useInfiniteCommunities,
  useJoinCommunity,
  useLeaveCommunity,
  useCommunityCategories,
} from '@/services/api/hooks/useCommunities';
import type { CommunitiesStackScreenProps } from '@/navigation/types';
import type { Community, CommunityFilters } from '@/types';

type Props = CommunitiesStackScreenProps<'CommunitiesList'>;

export const CommunitiesListScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const [filters, setFilters] = useState<CommunityFilters>({
    sortBy: 'activity',
    sortOrder: 'desc',
    limit: 20,
  });

  // Queries
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteCommunities(filters);

  const { data: categories = [] } = useCommunityCategories();
  const joinCommunityMutation = useJoinCommunity();
  const leaveCommunityMutation = useLeaveCommunity();

  // Mock data for subjects, grade levels, and locations
  // In a real app, these would come from API calls
  const subjects = [
    { id: '1', name: 'Mathematics', code: 'MATH' },
    { id: '2', name: 'English', code: 'ENG' },
    { id: '3', name: 'Science', code: 'SCI' },
    { id: '4', name: 'Social Studies', code: 'SS' },
  ];

  const gradeLevels = [
    { id: '1', name: 'Primary 1-3', order: 1 },
    { id: '2', name: 'Primary 4-7', order: 2 },
    { id: '3', name: 'Secondary 1-4', order: 3 },
    { id: '4', name: 'Secondary 5-6', order: 4 },
  ];

  const locations = [
    { id: '1', name: 'Kampala', district: 'Kampala', region: 'Central' },
    { id: '2', name: 'Entebbe', district: 'Wakiso', region: 'Central' },
    { id: '3', name: 'Jinja', district: 'Jinja', region: 'Eastern' },
  ];

  // Flatten communities data
  const communities = data?.pages.flatMap(page => page.data) ?? [];

  const handleCommunityPress = useCallback((community: Community) => {
    navigation.navigate('CommunityDetail', { communityId: community.id });
  }, [navigation]);

  const handleJoinCommunity = useCallback(async (community: Community) => {
    try {
      await joinCommunityMutation.mutateAsync({
        communityId: community.id,
        message: community.isPublic ? undefined : 'I would like to join this community.',
      });
      
      Alert.alert(
        'Success',
        community.isPublic 
          ? 'You have successfully joined the community!'
          : 'Your join request has been sent for approval.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to join community. Please try again.');
    }
  }, [joinCommunityMutation]);

  const handleLeaveCommunity = useCallback(async (community: Community) => {
    Alert.alert(
      'Leave Community',
      `Are you sure you want to leave "${community.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveCommunityMutation.mutateAsync(community.id);
              Alert.alert('Success', 'You have left the community.');
            } catch (error) {
              Alert.alert('Error', 'Failed to leave community. Please try again.');
            }
          },
        },
      ]
    );
  }, [leaveCommunityMutation]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderCommunityCard = useCallback(({ item }: { item: Community }) => (
    <CommunityCard
      community={item}
      onPress={handleCommunityPress}
      onJoin={handleJoinCommunity}
      onLeave={handleLeaveCommunity}
    />
  ), [handleCommunityPress, handleJoinCommunity, handleLeaveCommunity]);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>
          Loading more communities...
        </Text>
      </View>
    );
  }, [isFetchingNextPage, colors.onSurfaceVariant]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
          No Communities Found
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
          Try adjusting your search or filters to find communities.
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={handleRefresh}
        >
          <Text style={[styles.retryButtonText, { color: colors.onPrimary }]}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [isLoading, colors, handleRefresh]);

  if (isError) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.error }]}>
          Failed to Load Communities
        </Text>
        <Text style={[styles.errorMessage, { color: colors.onSurfaceVariant }]}>
          {error?.message || 'Something went wrong. Please try again.'}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={handleRefresh}
        >
          <Text style={[styles.retryButtonText, { color: colors.onPrimary }]}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CommunityFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        subjects={subjects}
        gradeLevels={gradeLevels}
        locations={locations}
        categories={categories}
      />
      
      <FlatList
        data={communities}
        renderItem={renderCommunityCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
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