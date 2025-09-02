/**
 * Government Content Search Component
 * Provides search functionality with filters for government content
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { GovernmentContentSearchProps } from '../types';
import { useTheme } from '../../../theme';

export const GovernmentContentSearch: React.FC<GovernmentContentSearchProps> = ({
  onSearch,
  initialQuery = '',
  placeholder = 'Search government content...',
  showFilters = true,
  onToggleFilters,
}) => {
  const { colors, typography } = useTheme();
  const [query, setQuery] = useState(initialQuery);

  const handleSearch = useCallback(() => {
    onSearch?.(query);
  }, [query, onSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    onSearch?.('');
  }, [onSearch]);

  const handleSubmit = useCallback(() => {
    handleSearch();
  }, [handleSearch]);

  return (
    <View style={styles.container}>
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.searchInputContainer}>
          <TouchableOpacity style={styles.searchIcon} onPress={handleSearch}>
            <Text style={[styles.iconText, { color: colors.text.tertiary }]}>
              🔍
            </Text>
          </TouchableOpacity>
          
          <TextInput
            style={[
              styles.searchInput,
              { color: colors.text.primary },
            ]}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSubmit}
            placeholder={placeholder}
            placeholderTextColor={colors.text.tertiary}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          {query.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <Text style={[styles.iconText, { color: colors.text.tertiary }]}>
                ✕
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {showFilters && onToggleFilters && (
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.neutral.light }]}
            onPress={onToggleFilters}
          >
            <Text style={[styles.iconText, { color: colors.text.secondary }]}>
              ⚙️
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    padding: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
  },
  iconText: {
    fontSize: 16,
  },
});