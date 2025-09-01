import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { useTheme } from '@/theme';
import { MultiSelect } from '@/components/ui/MultiSelect/MultiSelect';
import type { CommunityFilters, Subject, GradeLevel, Location } from '@/types';

interface CommunityFiltersProps {
  filters: CommunityFilters;
  onFiltersChange: (filters: CommunityFilters) => void;
  subjects: Subject[];
  gradeLevels: GradeLevel[];
  locations: Location[];
  categories: any[];
}

export const CommunityFiltersComponent: React.FC<CommunityFiltersProps> = ({
  filters,
  onFiltersChange,
  subjects,
  gradeLevels,
  locations,
  categories,
}) => {
  const { colors, typography } = useTheme();
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState<CommunityFilters>(filters);

  const handleSearchChange = (search: string) => {
    const newFilters = { ...filters, search: search || undefined };
    onFiltersChange(newFilters);
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    const resetFilters: CommunityFilters = {
      search: filters.search,
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    setShowFilters(false);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.category) count++;
    if (filters.subjects?.length) count++;
    if (filters.gradeLevels?.length) count++;
    if (filters.location) count++;
    if (filters.activityLevel) count++;
    if (filters.isPublic !== undefined) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surfaceVariant }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.onSurface }]}
          placeholder="Search communities..."
          placeholderTextColor={colors.onSurfaceVariant}
          value={filters.search || ''}
          onChangeText={handleSearchChange}
        />
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowFilters(true)}
        >
          <Text style={[styles.filterIcon, { color: colors.onPrimary }]}>⚙️</Text>
          {activeFiltersCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.error }]}>
              <Text style={[styles.filterBadgeText, { color: colors.onError }]}>
                {activeFiltersCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Sort Options */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sortContainer}
        contentContainerStyle={styles.sortContent}
      >
        {[
          { key: 'name', label: 'Name' },
          { key: 'memberCount', label: 'Members' },
          { key: 'activity', label: 'Activity' },
          { key: 'created', label: 'Newest' },
        ].map((sort) => (
          <TouchableOpacity
            key={sort.key}
            style={[
              styles.sortButton,
              {
                backgroundColor: filters.sortBy === sort.key ? colors.primary : colors.surfaceVariant,
              },
            ]}
            onPress={() =>
              onFiltersChange({
                ...filters,
                sortBy: sort.key as any,
                sortOrder: filters.sortBy === sort.key && filters.sortOrder === 'asc' ? 'desc' : 'asc',
              })
            }
          >
            <Text
              style={[
                styles.sortButtonText,
                {
                  color: filters.sortBy === sort.key ? colors.onPrimary : colors.onSurfaceVariant,
                },
              ]}
            >
              {sort.label}
              {filters.sortBy === sort.key && (
                <Text> {filters.sortOrder === 'asc' ? '↑' : '↓'}</Text>
              )}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.outline }]}>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={[styles.modalHeaderButton, { color: colors.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.onBackground }]}>
              Filters
            </Text>
            <TouchableOpacity onPress={handleResetFilters}>
              <Text style={[styles.modalHeaderButton, { color: colors.error }]}>
                Reset
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Category Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.onBackground }]}>
                Category
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryContainer}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryButton,
                        {
                          backgroundColor:
                            localFilters.category === category.id
                              ? colors.primary
                              : colors.surfaceVariant,
                        },
                      ]}
                      onPress={() =>
                        setLocalFilters({
                          ...localFilters,
                          category: localFilters.category === category.id ? undefined : category.id,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.categoryButtonText,
                          {
                            color:
                              localFilters.category === category.id
                                ? colors.onPrimary
                                : colors.onSurfaceVariant,
                          },
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Subjects Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.onBackground }]}>
                Subjects
              </Text>
              <MultiSelect
                options={subjects.map(s => ({ id: s.id, label: s.name }))}
                selectedIds={localFilters.subjects || []}
                onSelectionChange={(selectedIds) =>
                  setLocalFilters({
                    ...localFilters,
                    subjects: selectedIds.length > 0 ? selectedIds : undefined,
                  })
                }
                placeholder="Select subjects..."
              />
            </View>

            {/* Grade Levels Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.onBackground }]}>
                Grade Levels
              </Text>
              <MultiSelect
                options={gradeLevels.map(g => ({ id: g.id, label: g.name }))}
                selectedIds={localFilters.gradeLevels || []}
                onSelectionChange={(selectedIds) =>
                  setLocalFilters({
                    ...localFilters,
                    gradeLevels: selectedIds.length > 0 ? selectedIds : undefined,
                  })
                }
                placeholder="Select grade levels..."
              />
            </View>

            {/* Location Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.onBackground }]}>
                Location
              </Text>
              <MultiSelect
                options={locations.map(l => ({ id: l.id, label: `${l.name}, ${l.district}` }))}
                selectedIds={localFilters.location ? [localFilters.location] : []}
                onSelectionChange={(selectedIds) =>
                  setLocalFilters({
                    ...localFilters,
                    location: selectedIds.length > 0 ? selectedIds[0] : undefined,
                  })
                }
                placeholder="Select location..."
                multiSelect={false}
              />
            </View>

            {/* Activity Level Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.onBackground }]}>
                Activity Level
              </Text>
              <View style={styles.activityLevelContainer}>
                {[
                  { key: 'low', label: 'Quiet' },
                  { key: 'medium', label: 'Moderate' },
                  { key: 'high', label: 'Active' },
                  { key: 'very_high', label: 'Very Active' },
                ].map((level) => (
                  <TouchableOpacity
                    key={level.key}
                    style={[
                      styles.activityButton,
                      {
                        backgroundColor:
                          localFilters.activityLevel === level.key
                            ? colors.primary
                            : colors.surfaceVariant,
                      },
                    ]}
                    onPress={() =>
                      setLocalFilters({
                        ...localFilters,
                        activityLevel:
                          localFilters.activityLevel === level.key ? undefined : level.key as any,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.activityButtonText,
                        {
                          color:
                            localFilters.activityLevel === level.key
                              ? colors.onPrimary
                              : colors.onSurfaceVariant,
                        },
                      ]}
                    >
                      {level.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Public/Private Filter */}
            <View style={styles.filterSection}>
              <View style={styles.switchRow}>
                <Text style={[styles.filterLabel, { color: colors.onBackground }]}>
                  Public Communities Only
                </Text>
                <Switch
                  value={localFilters.isPublic === true}
                  onValueChange={(value) =>
                    setLocalFilters({
                      ...localFilters,
                      isPublic: value ? true : undefined,
                    })
                  }
                  trackColor={{ false: colors.surfaceVariant, true: colors.primary }}
                  thumbColor={colors.onPrimary}
                />
              </View>
            </View>
          </ScrollView>

          {/* Apply Button */}
          <View style={[styles.modalFooter, { borderTopColor: colors.outline }]}>
            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: colors.primary }]}
              onPress={handleApplyFilters}
            >
              <Text style={[styles.applyButtonText, { color: colors.onPrimary }]}>
                Apply Filters
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    position: 'relative',
  },
  filterIcon: {
    fontSize: 16,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  sortContainer: {
    marginBottom: 8,
  },
  sortContent: {
    paddingRight: 16,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalHeaderButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  filterSection: {
    marginVertical: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activityLevelContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  activityButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  activityButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  applyButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});