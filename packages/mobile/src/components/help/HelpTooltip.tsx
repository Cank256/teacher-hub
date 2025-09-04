import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HelpTooltipProps {
  content: string;
  title?: string;
  iconSize?: number;
  iconColor?: string;
  style?: any;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  content,
  title,
  iconSize = 20,
  iconColor = '#6B7280',
  style
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View style={style}>
      <TouchableOpacity
        onPress={() => setIsVisible(true)}
        style={styles.helpButton}
        accessibilityLabel="Help"
        accessibilityRole="button"
      >
        <Ionicons name="help-circle-outline" size={iconSize} color={iconColor} />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setIsVisible(false)}
        >
          <View style={styles.tooltipContainer}>
            <TouchableOpacity activeOpacity={1} style={styles.tooltip}>
              <View style={styles.tooltipHeader}>
                {title && <Text style={styles.tooltipTitle}>{title}</Text>}
                <TouchableOpacity
                  onPress={() => setIsVisible(false)}
                  style={styles.closeButton}
                  accessibilityLabel="Close help"
                >
                  <Ionicons name="close" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.tooltipContent}>{content}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  helpButton: {
    padding: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tooltipContainer: {
    maxWidth: 300,
    width: '100%',
  },
  tooltip: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  closeButton: {
    padding: 4,
  },
  tooltipContent: {
    fontSize: 14,
    color: '#E5E7EB',
    lineHeight: 20,
  },
});

export default HelpTooltip;