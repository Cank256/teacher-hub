import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '@/theme';
import { MultiSelect } from '@/components/ui/MultiSelect/MultiSelect';
import type {
  ResourceFilters as ResourceFiltersType,
  ResourceType,
  ResourceCategory,
  Subject,
  GradeLevel,
} from '@/types/resources';

interface ResourceFiltersProps {
  filters: ResourceFiltersType;
  onFiltersChange: (filters: ResourceFiltersType) => void;
  categories: ResourceCategory[];
  subjects: Subject[];
  gradeLevels: GradeLevel[];
  visible: boolean;
  onClose: () => void;
}

const RESOURCE_TYPES: Array<{ label: string; value: ResourceType }> = [
  { label: 'Documents', value: 'document' },
  { label: 'Images', value: 'image' },
  { label: 'Videos', value: 'video' },
  { label: 'YouTube Videos', value: 'youtube_video' },
  { label: 'Audio', value: 'audio' },
  { label: 'Presentations', value: 'presentation' },
  { label: 'Spreadsheets', value: 'spreadsheet' },
];

const RATING_OPTIONS = [
  { label: '4+ Stars', value: 4 },
  { label: '3+ Stars', value: 3 },
  { label: '2+ Stars', value: 2 },
  { label: '1+ Stars', value: 1 },
];

export const ResourceFilters: React.FC<ResourceFiltersProps> = ({
  filters,
  onFiltersChange,
  categories,
  subjects,
  gradeLevels,
  visible,
  onClose,
}) => {
  const { colors, spacing } = useTheme();
  const [localFilters, setLocalFilters] = useState<ResourceFiltersType>(filters);

  const updateFilter = (key: keyof ResourceFiltersType, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const clearFilters = () => {
    const clearedFilters: ResourceFiltersType = {};
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    onClose();
  };

  const renderFilterSection = (title: string, children: React.ReactNode) => (
    <View style={styles.filterSection}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
        {title}
      </Text>
      {children}
    </View>
  );

  const renderTypeFilter = () => (
    renderFilterSection('Resource Type', (
      <View style={styles.typeGrid}>
        {RESOURCE_TYPES.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.typeChip,
              {
                backgroundColor: localFilters.type === type.value
                  ? colors.primary
                  : colors.background.secondary,
                borderColor: colors.border,
              },
            ]}
            onPress={() => updateFilter('type', 
              localFilters.type === type.value ? undefined : type.value
            )}
          >
            <Text
              style={[
                styles.typeChipText,
                {
                  color: localFilters.type === type.value
                    ? colors.background.primary
                    : colors.text.primary,
                },
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    ))
  );

  const renderCategoryFilter = () => (
    renderFilterSection('Category', (
      <MultiSelect
        data={categories.map(cat => ({ label: cat.name, value: cat.id }))}
        selectedValues={localFilters.category ? [localFilters.category] : []}
        onSelectionChange={(values) => updateFilter('category', values[0])}
        placeholder="Select category"
        single
      />
    ))
  );

  const renderSubjectFilter = () => (
    renderFilterSection('Subject', (
      <MultiSelect
        data={subjects.map(subject => ({ label: subject.name, value: subject.id }))}
        selectedValues={localFilters.subject ? [localFilters.subject] : []}
        onSelectionChange={(values) => updateFilter('subject', values[0])}
        placeholder="Select subject"
        single
      />
    ))
  );

  const renderGradeLevelFilter = () => (
    renderFilterSection('Grade Level', (
      <MultiSelect
        data={gradeLevels.map(level => ({ label: level.name, value: level.id }))}
        selectedValues={localFilters.gradeLevel ? [localFilters.gradeLevel] : []}
        onSelectionChange={(values) => updateFilter('gradeLevel', values[0])}
        placeholder="Select grade level"
        single
      />
    ))
  );

  const renderRatingFilter = () => (
    renderFilterSection('Minimum Rating', (
      <View style={styles.ratingOptions}>
        {RATING_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.ratingOption,
              {
                backgroundColor: localFilters.rating === option.value
                  ? colors.primary
                  : colors.background.secondary,
                borderColor: colors.border,
              },
            ]}
            onPress={() => updateFilter('rating',
              localFilters.rating === option.value ? undefined : option.value
            )}
          >
            <View style={styles.ratingContent}>
              <View style={styles.stars}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Icon
                    key={i}
                    name="star"
                    size={16}
                    color={i < option.value ? '#FFD700' : '#E0E0E0'}
                  />
                ))}
              </View>
              <Text
                style={[
                  styles.ratingText,
                  {
                    color: localFilters.rating === option.value
                      ? colors.background.primary
                      : colors.text.primary,
                  },
                ]}
              >
                {option.label}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    ))
  );

  const getActiveFiltersCount = () => {
    return Object.values(localFilters).filter(value => 
      value !== undefined && value !== null && value !== ''
    ).length;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            Filters
          </Text>
          
          <TouchableOpacity onPress={clearFilters}>
            <Text style={[styles.clearButton, { color: colors.primary }]}>
              Clear
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderTypeFilter()}
          {renderCategoryFilter()}
          {renderSubjectFilter()}
          {renderGradeLevelFilter()}
          {renderRatingFilter()}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: colors.primary }]}
            onPress={applyFilters}
          >
            <Text style={[styles.applyButtonText, { color: colors.background.primary }]}>
              Apply Filters {getActiveFiltersCount() > 0 && `(${getActiveFiltersCount()})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  clearButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  filterSection: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  ratingOptions: {
    gap: 8,
  },
  ratingOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  ratingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  applyButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});