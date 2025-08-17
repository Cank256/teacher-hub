import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useDispatch, useSelector} from 'react-redux';

import {ResourceUploader} from '../../components/resources/ResourceUploader';
import {VideoPlayer} from '../../components/resources/VideoPlayer';
import {
  fetchResources,
  setSearchQuery,
  setFilters,
  clearFilters,
  Resource,
} from '../../store/slices/resourcesSlice';
import {theme} from '../../styles/theme';
import {AppDispatch, RootState} from '../../store';

export const ResourcesScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {resources, isLoading, searchQuery, filters} = useSelector(
    (state: RootState) => state.resources
  );
  
  const [showUploader, setShowUploader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'videos' | 'images' | 'documents'>('all');

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      await dispatch(fetchResources({})).unwrap();
    } catch (error) {
      console.error('Failed to load resources:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadResources();
    setRefreshing(false);
  };

  const handleSearch = (query: string) => {
    dispatch(setSearchQuery(query));
  };

  const handleFilterChange = (filter: 'all' | 'videos' | 'images' | 'documents') => {
    setActiveFilter(filter);
    
    if (filter === 'all') {
      dispatch(clearFilters());
    } else {
      const typeMap = {
        videos: ['video'],
        images: ['image'],
        documents: ['document', 'text'],
      };
      dispatch(setFilters({type: typeMap[filter]}));
    }
  };

  const handleResourcePress = (resource: Resource) => {
    // Navigate to resource detail screen
    console.log('Resource pressed:', resource.id);
    // navigation.navigate('ResourceDetail', {resourceId: resource.id});
  };

  const handleDownloadResource = async (resource: Resource) => {
    try {
      Alert.alert(
        'Download Resource',
        `Download "${resource.title}"?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Download',
            onPress: () => {
              // In a real implementation, this would download the resource
              console.log('Downloading resource:', resource.id);
              Alert.alert('Success', 'Resource downloaded successfully!');
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to download resource');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video':
        return 'play-circle-outline';
      case 'image':
        return 'image';
      case 'document':
        return 'description';
      default:
        return 'insert-drive-file';
    }
  };

  const renderResource = ({item}: {item: Resource}) => (
    <TouchableOpacity
      style={styles.resourceItem}
      onPress={() => handleResourcePress(item)}
      activeOpacity={0.7}>
      
      <View style={styles.resourceContent}>
        {/* Resource Preview */}
        <View style={styles.resourcePreview}>
          {item.type === 'video' ? (
            <VideoPlayer
              videoUri={item.url}
              thumbnailUri={item.thumbnailUrl}
              title={item.title}
              style={styles.videoPreview}
            />
          ) : item.type === 'image' && item.thumbnailUrl ? (
            <Image
              source={{uri: item.thumbnailUrl}}
              style={styles.imagePreview}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.iconPreview}>
              <Icon
                name={getResourceIcon(item.type)}
                size={32}
                color={theme.colors.primary}
              />
            </View>
          )}
        </View>

        {/* Resource Info */}
        <View style={styles.resourceInfo}>
          <Text style={styles.resourceTitle} numberOfLines={2}>
            {item.title}
          </Text>
          
          <Text style={styles.resourceDescription} numberOfLines={2}>
            {item.description}
          </Text>
          
          <View style={styles.resourceMeta}>
            <View style={styles.metaItem}>
              <Icon name="person" size={12} color={theme.colors.textSecondary} />
              <Text style={styles.metaText}>{item.author.name}</Text>
              {item.author.verified && (
                <Icon name="verified" size={12} color={theme.colors.success} />
              )}
            </View>
            
            <View style={styles.metaItem}>
              <Icon name="download" size={12} color={theme.colors.textSecondary} />
              <Text style={styles.metaText}>{item.downloadCount}</Text>
            </View>
            
            <View style={styles.metaItem}>
              <Icon name="star" size={12} color={theme.colors.warning} />
              <Text style={styles.metaText}>{item.rating.toFixed(1)}</Text>
            </View>
          </View>
          
          <View style={styles.resourceTags}>
            {item.subjects.slice(0, 2).map((subject, index) => (
              <View key={index} style={styles.subjectTag}>
                <Text style={styles.subjectTagText}>{subject}</Text>
              </View>
            ))}
            {item.subjects.length > 2 && (
              <Text style={styles.moreSubjects}>+{item.subjects.length - 2}</Text>
            )}
          </View>
          
          <View style={styles.resourceFooter}>
            <Text style={styles.resourceSize}>
              {formatFileSize(item.size)} • {item.format.toUpperCase()}
            </Text>
            
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => handleDownloadResource(item)}
              activeOpacity={0.7}>
              <Icon name="download" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="folder-open" size={64} color={theme.colors.textLight} />
      <Text style={styles.emptyStateTitle}>No resources found</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery 
          ? 'Try searching with different keywords'
          : 'Upload your first educational resource to get started!'
        }
      </Text>
      {!searchQuery && (
        <TouchableOpacity
          style={styles.emptyStateButton}
          onPress={() => setShowUploader(true)}
          activeOpacity={0.7}>
          <Text style={styles.emptyStateButtonText}>Upload Resource</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Resources</Text>
      
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={() => setShowUploader(true)}
        activeOpacity={0.7}>
        <Icon name="cloud-upload" size={20} color={theme.colors.primary} />
        <Text style={styles.uploadButtonText}>Upload</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Icon name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search resources..."
          placeholderTextColor={theme.colors.textLight}
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => handleSearch('')}
            style={styles.clearButton}
            activeOpacity={0.7}>
            <Icon name="close" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {[
        {key: 'all', label: 'All', icon: 'apps'},
        {key: 'videos', label: 'Videos', icon: 'play-circle-outline'},
        {key: 'images', label: 'Images', icon: 'image'},
        {key: 'documents', label: 'Documents', icon: 'description'},
      ].map((filter) => (
        <TouchableOpacity
          key={filter.key}
          style={[
            styles.filterButton,
            activeFilter === filter.key && styles.filterButtonActive,
          ]}
          onPress={() => handleFilterChange(filter.key as any)}
          activeOpacity={0.7}>
          <Icon
            name={filter.icon}
            size={16}
            color={activeFilter === filter.key ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.filterButtonText,
              activeFilter === filter.key && styles.filterButtonTextActive,
            ]}>
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderSearchBar()}
      {renderFilters()}
      
      <FlatList
        data={resources}
        renderItem={renderResource}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentContainer,
          resources.length === 0 && styles.emptyContentContainer,
        ]}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowUploader(true)}
        activeOpacity={0.8}>
        <Icon name="add" size={24} color={theme.colors.surface} />
      </TouchableOpacity>

      {/* Resource Uploader Modal */}
      <ResourceUploader
        visible={showUploader}
        onClose={() => setShowUploader(false)}
        onResourceUploaded={() => {
          setShowUploader(false);
          handleRefresh();
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.textPrimary,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.borderLight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  uploadButtonText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.sm,
    paddingVertical: 0,
  },
  clearButton: {
    padding: theme.spacing.xs,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.borderLight,
    borderColor: theme.colors.primary,
  },
  filterButtonText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  contentContainer: {
    paddingBottom: 100, // Space for FAB
  },
  emptyContentContainer: {
    flexGrow: 1,
  },
  resourceItem: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
    overflow: 'hidden',
  },
  resourceContent: {
    padding: theme.spacing.md,
  },
  resourcePreview: {
    marginBottom: theme.spacing.md,
  },
  videoPreview: {
    height: 120,
  },
  imagePreview: {
    width: '100%',
    height: 120,
    borderRadius: theme.borderRadius.md,
  },
  iconPreview: {
    height: 120,
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  resourceDescription: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  resourceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  metaText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  resourceTags: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  subjectTag: {
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    marginRight: theme.spacing.xs,
  },
  subjectTagText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  moreSubjects: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
    marginLeft: theme.spacing.xs,
  },
  resourceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resourceSize: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
  },
  downloadButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.borderLight,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
  },
  emptyStateTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyStateText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.xl,
  },
  emptyStateButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  emptyStateButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    right: theme.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.lg,
  },
});