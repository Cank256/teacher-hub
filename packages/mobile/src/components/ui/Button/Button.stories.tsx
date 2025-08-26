import React from 'react';
import { View } from 'react-native';
import { action } from '@storybook/addon-actions';
import { ThemeProvider } from '../../../theme/ThemeContext';
import Button from './Button';

// Note: Using any for now due to Storybook React Native type limitations
type Meta = any;
type StoryObj = any;

// Mock icon component for stories
const MockIcon = () => (
  <View style={{ width: 16, height: 16, backgroundColor: 'currentColor' }} />
);

const meta: Meta = {
  title: 'UI/Button',
  component: Button,
  decorators: [
    (Story: any) => (
      <ThemeProvider>
        <View style={{ padding: 16 }}>
          <Story />
        </View>
      </ThemeProvider>
    ),
  ],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'outline', 'ghost'],
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    disabled: {
      control: { type: 'boolean' },
    },
    loading: {
      control: { type: 'boolean' },
    },
    hapticFeedback: {
      control: { type: 'boolean' },
    },
    iconPosition: {
      control: { type: 'select' },
      options: ['left', 'right'],
    },
  },
  args: {
    onPress: action('onPress'),
  },
};

export default meta;

type Story = StoryObj;

export const Primary: Story = {
  args: {
    title: 'Primary Button',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    title: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Outline: Story = {
  args: {
    title: 'Outline Button',
    variant: 'outline',
  },
};

export const Ghost: Story = {
  args: {
    title: 'Ghost Button',
    variant: 'ghost',
  },
};

export const Small: Story = {
  args: {
    title: 'Small Button',
    size: 'small',
  },
};

export const Medium: Story = {
  args: {
    title: 'Medium Button',
    size: 'medium',
  },
};

export const Large: Story = {
  args: {
    title: 'Large Button',
    size: 'large',
  },
};

export const Disabled: Story = {
  args: {
    title: 'Disabled Button',
    disabled: true,
  },
};

export const Loading: Story = {
  args: {
    title: 'Loading Button',
    loading: true,
  },
};

export const WithLeftIcon: Story = {
  args: {
    title: 'Button with Icon',
    icon: <MockIcon />,
    iconPosition: 'left',
  },
};

export const WithRightIcon: Story = {
  args: {
    title: 'Button with Icon',
    icon: <MockIcon />,
    iconPosition: 'right',
  },
};

export const NoHapticFeedback: Story = {
  args: {
    title: 'No Haptic Feedback',
    hapticFeedback: false,
  },
};

export const AllVariants: Story = {
  render: () => (
    <View style={{ gap: 16 }}>
      <Button title="Primary" onPress={action('primary-pressed')} variant="primary" />
      <Button title="Secondary" onPress={action('secondary-pressed')} variant="secondary" />
      <Button title="Outline" onPress={action('outline-pressed')} variant="outline" />
      <Button title="Ghost" onPress={action('ghost-pressed')} variant="ghost" />
    </View>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <View style={{ gap: 16 }}>
      <Button title="Small" onPress={action('small-pressed')} size="small" />
      <Button title="Medium" onPress={action('medium-pressed')} size="medium" />
      <Button title="Large" onPress={action('large-pressed')} size="large" />
    </View>
  ),
};

export const AllStates: Story = {
  render: () => (
    <View style={{ gap: 16 }}>
      <Button title="Normal" onPress={action('normal-pressed')} />
      <Button title="Disabled" onPress={action('disabled-pressed')} disabled />
      <Button title="Loading" onPress={action('loading-pressed')} loading />
    </View>
  ),
};