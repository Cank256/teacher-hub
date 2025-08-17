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
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useDispatch, useSelector} from 'react-redux';

import {CommunityCard} from '../../components/communities/CommunityCard';
import {CommunityCreator} from '../../components/communities/CommunityCreator';
import {
  fetchCommunities,
  searchCommunities,
  setSearchQuery,
  clearSearchResults,
  Community,
} from '../../store/slices/communitiesSlice';
import {theme} from '../../styles/theme';
import {AppDispatch, RootState} from '../../store';

export const CommunitiesScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    communities,
    myCommunities,
    searchResults,
    isLoading,
    isSearching,
    searchQuery,
  } = useSelector((state: RootState) => state.communities);
  
  const [activeTab, setActiveTab] = useState<'discover' | 'my'>('discover');
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    try {
      await dispatch(fetchCommunities()).unwrap();
    } catch (error) {
      console.error('Failed to load communities:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCommunities();
    setRefreshing(false);
  };

  const handleSearch = async (query: string) => {
    dispatch(setSearchQuery(query));
    
    if (query.trim().length > 0) {
      try {
        await dispatch(searchCommunities({query})).unwrap();
      } catch (error) {
        console.error('Search failed:', error);
      }
    } else {
      dispatch(clearSearchResults());
    }
  };

  const handleCommunityPress = (community: Community) => {
    // Navigate to community detail screen
    console.log('Community pressed:', community.id);
    // navigation.navigate('CommunityDetail', {communityId: community.id});
  };

  const handleJoinCommunity = () => {
    // Refresh the list after joining
    loadCommunities();
  };

  const handleLeaveCommunity = () => {
    // Refresh the list after leaving
    loadCommunities();
  };

  const getDisplayData = () => {
    if (searchQuery.trim().length > 0) {
      return searchResults;
    }
    return activeTab === 'my' ? myCommunities : communities;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Communities</Text>
      
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowCreateCommunity(true)}
        activeOpacity={0.7}>
        <Icon name="add" size={20} color={theme.colors.primary} />
        <Text style={styles.createButtonText}>Create</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Icon name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search communities..."
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

  const renderTabs = () => {
    if (searchQuery.trim().length > 0) return null;
    
    return (
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
          onPress={() => setActiveTab('discover')}
          activeOpacity={0.7}>
          <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>
            Discover
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my' && styles.activeTab]}
          onPress={() => setActiveTab('my')}
          activeOpacity={0.7}>
          <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>
            My Communities ({myCommunities.length})
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCommunity = ({item}: {item: Community}) => (
    <CommunityCard
      community={item}
      onPress={() => handleCommunityPress(item)}
      onJoin={handleJoinCommunity}
      onLeave={handleLeaveCommunity}
      showJoinButton={true}
    />
  );

  const renderEmptyState = () => {
    const isSearching = searchQuery.trim().length > 0;
    const isMyTab = activeTab === 'my';
    
    return (
      <View style={styles.emptyState}>
        <Icon
          name={isSearching ? 'search-off' : isMyTab ? 'group-add' : 'explore'}
          size={64}
          color={theme.colors.textLight}
        />
        <Text style={styles.emptyStateTitle}>
          {isSearching
            ? 'No communities found'
            : isMyTab
            ? 'No communities joined'
            : 'No communities available'
          }
        </Text>
        <Text style={styles.emptyStateText}>
          {isSearching
            ? 'Try searching with different keywords'
            : isMyTab
            ? 'Join communities to see them here'
            : 'Be the first to create a community!'
          }
        </Text>
        {!isSearching && (
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => setShowCreateCommunity(true)}
            activeOpacity={0.7}>
            <Text style={styles.emptyStateButtonText}>Create Community</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderSearchBar()}
      {renderTabs()}
      
      <FlatList
        data={getDisplayData()}
        renderItem={renderCommunity}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={!isLoading && !isSearching ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentContainer,
          getDisplayData().length === 0 && styles.emptyContentContainer,
        ]}
      />

      {/* Create Community Modal */}
      {showCreateCommunity && (
        <View style={styles.modalContainer}>
          <CommunityCreator
            onClose={() => setShowCreateCommunity(false)}
            onCommunityCreated={() => {
              setShowCreateCommunity(false);
              handleRefresh();
            }}
          />
        </View>
      )}
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.borderLight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  createButtonText: {
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  contentContainer: {
    paddingBottom: theme.spacing.lg,
  },
  emptyContentContainer: {
    flexGrow: 1,
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
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.background,
    zIndex: 2000,
  },
});