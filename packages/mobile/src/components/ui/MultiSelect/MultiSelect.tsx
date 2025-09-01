import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  SafeAreaView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeContext';
import { HapticService } from '@/services/haptics';
import Text from '../Text';
import Button from '../Button';
import Input from '../Input';

export interface MultiSelectOption {
  id: string;
  label: string;
  value: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  selectedValues: string[];
  onSelectionChange: (selectedValues: string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  maxSelections?: number;
  searchable?: boolean;
  disabled?: boolean;
  testID?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selectedValues,
  onSelectionChange,
  placeholder = 'Select options...',
  label,
  error,
  maxSelections,
  searchable = true,
  disabled = false,
  testID,
}) => {
  const { theme } = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const modalAnimation = useSharedValue(0);

  const filteredOptions = searchable && searchQuery
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const selectedOptions = options.filter(option =>
    selectedValues.includes(option.value)
  );

  const handleOpenModal = async () => {
    if (disabled) return;
    
    await HapticService.buttonPress();
    setIsModalVisible(true);
    modalAnimation.value = withTiming(1, { duration: 300 });
  };

  const handleCloseModal = () => {
    modalAnimation.value = withTiming(0, { duration: 300 });
    setTimeout(() => {
      setIsModalVisible(false);
      setSearchQuery('');
    }, 300);
  };

  const handleToggleOption = async (optionValue: string) => {
    await HapticService.selectionChanged();

    const isSelected = selectedValues.includes(optionValue);
    let newSelection: string[];

    if (isSelected) {
      newSelection = selectedValues.filter(value => value !== optionValue);
    } else {
      if (maxSelections && selectedValues.length >= maxSelections) {
        return; // Don't allow more selections
      }
      newSelection = [...selectedValues, optionValue];
    }

    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    const allValues = filteredOptions.map(option => option.value);
    const limitedValues = maxSelections 
      ? allValues.slice(0, maxSelections)
      : allValues;
    onSelectionChange(limitedValues);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    opacity: modalAnimation.value,
    transform: [
      {
        scale: 0.9 + (modalAnimation.value * 0.1),
      },
    ],
  }));

  const getDisplayText = () => {
    if (selectedOptions.length === 0) {
      return placeholder;
    }

    if (selectedOptions.length === 1) {
      return selectedOptions[0].label;
    }

    return `${selectedOptions.length} selected`;
  };

  const renderTrigger = () => (
    <TouchableOpacity
      style={[
        styles.trigger,
        {
          borderColor: error ? theme.colors.error : theme.colors.border,
          backgroundColor: disabled ? theme.colors.surface : 'transparent',
          borderRadius: theme.borderRadius.md,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.md,
          minHeight: 48,
        },
      ]}
      onPress={handleOpenModal}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Tap to open selection modal"
    >
      <Text
        style={[
          styles.triggerText,
          {
            color: selectedOptions.length > 0 
              ? theme.colors.text 
              : theme.colors.textSecondary,
          },
        ]}
      >
        {getDisplayText()}
      </Text>
      <Text style={[styles.arrow, { color: theme.colors.textSecondary }]}>
        ▼
      </Text>
    </TouchableOpacity>
  );

  const renderSelectedChips = () => {
    if (selectedOptions.length === 0) return null;

    return (
      <View style={styles.chipsContainer}>
        {selectedOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.chip,
              {
                backgroundColor: theme.colors.primary,
                borderRadius: theme.borderRadius.full,
              },
            ]}
            onPress={() => handleToggleOption(option.value)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${option.label}`}
          >
            <Text style={[styles.chipText, { color: '#FFFFFF' }]}>
              {option.label}
            </Text>
            <Text style={[styles.chipRemove, { color: '#FFFFFF' }]}>
              ×
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderModal = () => (
    <Modal
      visible={isModalVisible}
      transparent
      animationType="fade"
      onRequestClose={handleCloseModal}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalContainer}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.lg,
              },
              modalAnimatedStyle,
            ]}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  {
                    fontSize: theme.typography.fontSize.lg,
                    fontFamily: theme.typography.fontFamily.semibold,
                    color: theme.colors.text,
                  },
                ]}
              >
                {label || 'Select Options'}
              </Text>
              <TouchableOpacity
                onPress={handleCloseModal}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text style={[styles.closeText, { color: theme.colors.textSecondary }]}>
                  ×
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            {searchable && (
              <View style={styles.searchContainer}>
                <Input
                  placeholder="Search options..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  variant="outlined"
                />
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <Button
                title="Select All"
                variant="ghost"
                size="small"
                onPress={handleSelectAll}
                disabled={filteredOptions.length === 0}
              />
              <Button
                title="Clear All"
                variant="ghost"
                size="small"
                onPress={handleClearAll}
                disabled={selectedValues.length === 0}
              />
            </View>

            {/* Options List */}
            <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
              {filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                const isDisabled = !isSelected && maxSelections && selectedValues.length >= maxSelections;

                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionItem,
                      {
                        backgroundColor: isSelected 
                          ? theme.colors.highlight 
                          : 'transparent',
                        opacity: isDisabled ? 0.5 : 1,
                      },
                    ]}
                    onPress={() => handleToggleOption(option.value)}
                    disabled={isDisabled}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: isSelected 
                            ? theme.colors.primary 
                            : theme.colors.border,
                          backgroundColor: isSelected 
                            ? theme.colors.primary 
                            : 'transparent',
                        },
                      ]}
                    >
                      {isSelected && (
                        <Text style={[styles.checkmark, { color: '#FFFFFF' }]}>
                          ✓
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: theme.colors.text,
                          fontFamily: theme.typography.fontFamily.regular,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <Button
                title="Done"
                onPress={handleCloseModal}
                variant="primary"
              />
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );

  return (
    <View>
      {label && (
        <Text
          style={[
            styles.label,
            {
              fontSize: theme.typography.fontSize.sm,
              fontFamily: theme.typography.fontFamily.medium,
              color: error ? theme.colors.error : theme.colors.text,
              marginBottom: theme.spacing.xs,
            },
          ]}
        >
          {label}
        </Text>
      )}
      
      {renderTrigger()}
      {renderSelectedChips()}
      
      {error && (
        <Text
          style={[
            styles.error,
            {
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.error,
              marginTop: theme.spacing.xs,
            },
          ]}
        >
          {error}
        </Text>
      )}
      
      {maxSelections && (
        <Text
          style={[
            styles.helperText,
            {
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              marginTop: theme.spacing.xs,
            },
          ]}
        >
          Maximum {maxSelections} selections allowed
        </Text>
      )}

      {renderModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  triggerText: {
    flex: 1,
  },
  arrow: {
    fontSize: 12,
    marginLeft: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chipRemove: {
    fontSize: 16,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  label: {
    marginBottom: 4,
  },
  error: {
    marginTop: 4,
  },
  helperText: {
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  modalContent: {
    maxHeight: '80%',
    width: '100%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  searchContainer: {
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  optionsList: {
    flex: 1,
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  optionText: {
    flex: 1,
  },
  modalFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});

export default MultiSelect;