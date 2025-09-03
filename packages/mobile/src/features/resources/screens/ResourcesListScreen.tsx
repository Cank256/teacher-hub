import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '@/theme';
import { SearchBar } from '@/components/common/SearchBar/SearchBar';
import { ResourceCard } from '@/components/resources/ResourceCard/ResourceCard';
import { ResourceFilters } from '@/components/resources/ResourceFilters/ResourceFilters';
import { LoadingSpinner } from '@/components/common/LoadingSpinner/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState/ErrorState';
import {
  useInfiniteResources,
  useResourceCategories,
  useSubjects,
  useGradeLevels,
  useInfiniteSearchResources,
} from '@/services/api/hooks/useResources';
import { OfflineResourceService } from '@/services/storage/offlineResourceService';
import type { ResourcesStackScreenProps } from '@/navigation/types';
import type { Resource, ResourceFilters as ResourceFiltersType, PaginatedResponse } from '@/types/resources';

type Props = ResourcesStackScreenProps<'ResourcesList'>;

export const ResourcesListScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { colors, spacing } = theme;
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ResourceFiltersType>({});
  const [showFilters, setShowFilters] = useState(false);
  const [downloadedResources, setDownloadedResources] = useState<Set<string>>(new Set());

  // Queries
  const {
    data: resourcesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = searchQuery.length > 0
      ? useInfiniteSearchResources(searchQuery, filters)
      : useInfiniteResources(filters);

  const { data: categories = [] } = useResourceCategories();
  const { data: subjects = [] } = useSubjects();
  const { data: gradeLevels = [] } = useGradeLevels();

  // Flatten paginated data
  const resources = resourcesData?.pages.flatMap((page) => (page as PaginatedResponse<Resource>).data) ?? [];

  // Check downloaded status for resources
  React.useEffect(() => {
    const checkDownloadedStatus = async () => {
      const downloaded = new Set<string>();
      for (const resource of resources) {
        const isDownloaded = await OfflineResourceService.isResourceDownloaded(resource.id);
        if (isDownloaded) {
          downloaded.add(resource.id);
        }
      }
      setDownloadedResources(downloaded);
    };

    if (resources.length > 0) {
      checkDownloadedStatus();
    }
  }, [resources]);

  const handleResourcePress = (resource: Resource) => {
    navigation.navigate('ResourceDetail', { resourceId: resource.id });
  };

  const handleDownloadResource = async (resource: Resource) => {
    try {
      await OfflineResourceService.downloadResource(resource);
      setDownloadedResources(prev => new Set(prev).add(resource.id));
    } catch (error) {
      console.error('Failed to download resource:', error);
    }
  };

  const handleRateResource = (resource: Resource) => {
    // TODO: Implement rating modal
    console.log('Rate resource:', resource.id);
  };

  const handleShareResource = (resource: Resource) => {
    // TODO: Implement sharing
    console.log('Share resource:', resource.id);
  };

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFiltersChange = (newFilters: ResourceFiltersType) => {
    setFilters(newFilters);
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value =>
      value !== undefined && value !== null && value !== ''
    ).length;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <SearchBar
        placeholder="Search resources..."
        onSearch={handleSearch}
      />

      <View style={styles.headerActions}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: getActiveFiltersCount() > 0 ? colors.primary : colors.background.secondary,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setShowFilters(true)}
        >
          <MaterialIcons
            name="filter-list"
            size={20}
            color={getActiveFiltersCount() > 0 ? colors.background.primary : colors.text.primary}
          />
          {getActiveFiltersCount() > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.background.primary }]}>
              <Text style={[styles.filterBadgeText, { color: colors.primary }]}>
                {getActiveFiltersCount()}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.uploadButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('UploadResource')}
        >
          <MaterialIcons name="add" size={20} color={colors.background.primary} />
          <Text style={[styles.uploadButtonText, { color: colors.background.primary }]}>
            Upload
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderResource = ({ item }: { item: Resource }) => (
    <ResourceCard
      resource={item}
      onPress={() => handleResourcePress(item)}
      onDownload={() => handleDownloadResource(item)}
      onRate={() => handleRateResource(item)}
      onShare={() => handleShareResource(item)}
      isDownloaded={downloadedResources.has(item.id)}
    />
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;

    return (
      <View style={styles.footer}>
        <LoadingSpinner size="small" />
      </View>
    );
  };

  const renderEmptyState = () => {
    if (searchQuery.length > 0) {
      return (
        <EmptyState
          title="No resources found"
          subtitle={`No resources match "${searchQuery}". Try adjusting your search or filters.`}
          actionText="Clear Search"
          onAction={() => setSearchQuery('')}
        />
      );
    }

    return (
      <EmptyState
        title="No resources yet"
        subtitle="Be the first to share educational resources with the community."
        actionText="Upload Resource"
        onAction={() => navigation.navigate('UploadResource')}
      />
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        {renderHeader()}
        <LoadingSpinner />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        {renderHeader()}
        <ErrorState
          title="Failed to load resources"
          message={error?.message || 'Something went wrong while loading resources.'}
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {renderHeader()}

      <FlashList
        data={resources}
        renderItem={renderResource}
        keyExtractor={(item) => item.id}
        estimatedItemSize={200}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <ResourceFilters
        visible={showFilters}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        categories={categories}
        subjects={subjects}
        gradeLevels={gradeLevels}
        onClose={() => setShowFilters(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});