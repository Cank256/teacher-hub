/**
 * Government Content Filters Component
 * Provides filtering options for government content
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { GovernmentContentFiltersProps } from '../types';
import {
  GovernmentContentType,
  GovernmentContentCategory,
  GovernmentSource,
  ContentPriority,
} from '../../../types';
import { useTheme } from '../../../theme';

export const GovernmentContentFilters: React.FC<GovernmentContentFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
  availableSubjects = [],
  availableGradeLevels = [],
}) => {
  const { colors, typography } = useTheme();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const updateFilter = <T extends keyof typeof filters>(
    key: T,
    value: typeof filters[T]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const toggleArrayFilter = <T,>(
    key: keyof typeof filters,
    value: T,
    currentArray: T[] = []
  ) => {
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    updateFilter(key, newArray.length > 0 ? newArray : undefined);
  };

  const renderFilterSection = (
    title: string,
    sectionKey: string,
    children: React.ReactNode
  ) => {
    const isExpanded = expandedSections.has(sectionKey);
    
    return (
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(sectionKey)}
        >
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            {title}
          </Text>
          <Text style={[styles.expandIcon, { color: colors.text.secondary }]}>
            {isExpanded ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.sectionContent}>
            {children}
          </View>
        )}
      </View>
    );
  };

  const renderChipFilter = <T,>(
    items: { value: T; label: string }[],
    selectedItems: T[] = [],
    onToggle: (value: T) => void
  ) => (
    <View style={styles.chipContainer}>
      {items.map(({ value, label }) => {
        const isSelected = selectedItems.includes(value);
        return (
          <TouchableOpacity
            key={String(value)}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? colors.primary : colors.neutral.light,
                borderColor: isSelected ? colors.primary : colors.neutral.medium,
              },
            ]}
            onPress={() => onToggle(value)}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: isSelected ? colors.white : colors.text.secondary,
                },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const contentTypes = Object.values(GovernmentContentType).map(type => ({
    value: type,
    label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
  }));

  const categories = Object.values(GovernmentContentCategory).map(category => ({
    value: category,
    label: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
  }));

  const sources = Object.values(GovernmentSource).map(source => ({
    value: source,
    label: source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
  }));

  const priorities = Object.values(ContentPriority).map(priority => ({
    value: priority,
    label: priority.replace(/\b\w/g, l => l.toUpperCase()),
  }));

  const subjects = availableSubjects.map(subject => ({
    value: subject,
    label: subject,
  }));

  const gradeLevels = availableGradeLevels.map(level => ({
    value: level,
    label: level,
  }));

  const hasActiveFilters = Object.values(filters).some(value => 
    Array.isArray(value) ? value.length > 0 : value !== undefined
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Filters
        </Text>
        {hasActiveFilters && onReset && (
          <TouchableOpacity onPress={onReset}>
            <Text style={[styles.resetText, { color: colors.primary }]}>
              Reset All
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderFilterSection('Content Type', 'type',
          renderChipFilter(
            contentTypes,
            filters.type,
            (value) => toggleArrayFilter('type', value, filters.type)
          )
        )}

        {renderFilterSection('Category', 'category',
          renderChipFilter(
            categories,
            filters.category,
            (value) => toggleArrayFilter('category', value, filters.category)
          )
        )}

        {renderFilterSection('Source', 'source',
          renderChipFilter(
            sources,
            filters.source,
            (value) => toggleArrayFilter('source', value, filters.source)
          )
        )}

        {renderFilterSection('Priority', 'priority',
          renderChipFilter(
            priorities,
            filters.priority,
            (value) => toggleArrayFilter('priority', value, filters.priority)
          )
        )}

        {subjects.length > 0 && renderFilterSection('Subjects', 'subjects',
          renderChipFilter(
            subjects,
            filters.subjects,
            (value) => toggleArrayFilter('subjects', value, filters.subjects)
          )
        )}

        {gradeLevels.length > 0 && renderFilterSection('Grade Levels', 'gradeLevels',
          renderChipFilter(
            gradeLevels,
            filters.gradeLevels,
            (value) => toggleArrayFilter('gradeLevels', value, filters.gradeLevels)
          )
        )}

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('offline')}
          >
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Availability
            </Text>
            <Text style={[styles.expandIcon, { color: colors.text.secondary }]}>
              {expandedSections.has('offline') ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>
          {expandedSections.has('offline') && (
            <View style={styles.sectionContent}>
              <TouchableOpacity
                style={[
                  styles.checkboxRow,
                  {
                    backgroundColor: filters.isOfflineAvailable
                      ? colors.primary + '20'
                      : 'transparent',
                  },
                ]}
                onPress={() => updateFilter('isOfflineAvailable', 
                  filters.isOfflineAvailable ? undefined : true
                )}
              >
                <Text style={[styles.checkbox, { color: colors.primary }]}>
                  {filters.isOfflineAvailable ? '☑' : '☐'}
                </Text>
                <Text style={[styles.checkboxLabel, { color: colors.text.primary }]}>
                  Available offline
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  resetText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    maxHeight: 400,
  },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  expandIcon: {
    fontSize: 12,
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  checkbox: {
    fontSize: 16,
    marginRight: 8,
  },
  checkboxLabel: {
    fontSize: 14,
  },
});