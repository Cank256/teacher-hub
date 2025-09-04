import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HelpModal from './HelpModal';

interface HelpButtonProps {
  section?: string;
  variant?: 'icon' | 'button' | 'text';
  size?: 'sm' | 'md' | 'lg';
  style?: any;
  textStyle?: any;
}

export const HelpButton: React.FC<HelpButtonProps> = ({
  section,
  variant = 'icon',
  size = 'md',
  style,
  textStyle
}) => {
  const [isHelpVisible, setIsHelpVisible] = useState(false);

  const sizes = {
    sm: { icon: 16, padding: 8, fontSize: 14 },
    md: { icon: 20, padding: 12, fontSize: 16 },
    lg: { icon: 24, padding: 16, fontSize: 18 }
  };

  const currentSize = sizes[size];

  const renderButton = () => {
    switch (variant) {
      case 'button':
        return (
          <TouchableOpacity
            onPress={() => setIsHelpVisible(true)}
            style={[styles.button, { padding: currentSize.padding }, style]}
            accessibilityLabel="Open help"
            accessibilityRole="button"
          >
            <Ionicons name="help-circle-outline" size={currentSize.icon} color="#FFFFFF" />
            <Text style={[styles.buttonText, { fontSize: currentSize.fontSize }, textStyle]}>
              Help
            </Text>
          </TouchableOpacity>
        );
      case 'text':
        return (
          <TouchableOpacity
            onPress={() => setIsHelpVisible(true)}
            style={[styles.textButton, { padding: currentSize.padding }, style]}
            accessibilityLabel="Open help"
            accessibilityRole="button"
          >
            <Ionicons name="help-circle-outline" size={currentSize.icon} color="#2563EB" />
            <Text style={[styles.textButtonText, { fontSize: currentSize.fontSize }, textStyle]}>
              Help
            </Text>
          </TouchableOpacity>
        );
      default:
        return (
          <TouchableOpacity
            onPress={() => setIsHelpVisible(true)}
            style={[styles.iconButton, { padding: currentSize.padding }, style]}
            accessibilityLabel="Open help"
            accessibilityRole="button"
          >
            <Ionicons name="help-circle-outline" size={currentSize.icon} color="#6B7280" />
          </TouchableOpacity>
        );
    }
  };

  return (
    <View>
      {renderButton()}
      <HelpModal
        isVisible={isHelpVisible}
        onClose={() => setIsHelpVisible(false)}
        initialSection={section}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    marginLeft: 8,
  },
  textButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  textButtonText: {
    color: '#2563EB',
    fontWeight: '500',
    marginLeft: 4,
  },
});

export default HelpButton;