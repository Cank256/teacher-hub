import React from 'react';
import { View } from 'react-native';
import { action } from '@storybook/addon-actions';
import { ThemeProvider } from '../../../theme/ThemeContext';
import Input from './Input';

// Note: Using any for now due to Storybook React Native type limitations
type Meta = any;
type StoryObj = any;

// Mock icon component for stories
const MockIcon = () => (
  <View style={{ width: 16, height: 16, backgroundColor: 'currentColor' }} />
);

const meta: Meta = {
  title: 'UI/Input',
  component: Input,
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
      options: ['outlined', 'filled'],
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    required: {
      control: { type: 'boolean' },
    },
    editable: {
      control: { type: 'boolean' },
    },
    showCharacterCount: {
      control: { type: 'boolean' },
    },
  },
  args: {
    onChangeText: action('onChangeText'),
    onFocus: action('onFocus'),
    onBlur: action('onBlur'),
  },
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'Enter your email',
  },
};

export const Required: Story = {
  args: {
    label: 'Password',
    placeholder: 'Enter your password',
    required: true,
  },
};

export const WithError: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'Enter your email',
    value: 'invalid-email',
    error: 'Please enter a valid email address',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Password',
    placeholder: 'Enter your password',
    helperText: 'Must be at least 8 characters long',
  },
};

export const WithCharacterCount: Story = {
  args: {
    label: 'Bio',
    placeholder: 'Tell us about yourself',
    value: 'Hello world!',
    showCharacterCount: true,
    maxLength: 100,
  },
};

export const WithLeftIcon: Story = {
  args: {
    label: 'Search',
    placeholder: 'Search...',
    leftIcon: <MockIcon />,
  },
};

export const WithRightIcon: Story = {
  args: {
    label: 'Password',
    placeholder: 'Enter your password',
    rightIcon: <MockIcon />,
    onRightIconPress: action('rightIconPress'),
  },
};

export const Filled: Story = {
  args: {
    label: 'Filled Input',
    placeholder: 'Enter text...',
    variant: 'filled',
  },
};

export const Outlined: Story = {
  args: {
    label: 'Outlined Input',
    placeholder: 'Enter text...',
    variant: 'outlined',
  },
};

export const Small: Story = {
  args: {
    label: 'Small Input',
    placeholder: 'Enter text...',
    size: 'small',
  },
};

export const Medium: Story = {
  args: {
    label: 'Medium Input',
    placeholder: 'Enter text...',
    size: 'medium',
  },
};

export const Large: Story = {
  args: {
    label: 'Large Input',
    placeholder: 'Enter text...',
    size: 'large',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Input',
    placeholder: 'This is disabled',
    value: 'Cannot edit this',
    editable: false,
  },
};

export const AllVariants: Story = {
  render: () => (
    <View style={{ gap: 16 }}>
      <Input
        label="Outlined Input"
        placeholder="Enter text..."
        variant="outlined"
        onChangeText={action('outlined-change')}
      />
      <Input
        label="Filled Input"
        placeholder="Enter text..."
        variant="filled"
        onChangeText={action('filled-change')}
      />
    </View>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <View style={{ gap: 16 }}>
      <Input
        label="Small Input"
        placeholder="Small size"
        size="small"
        onChangeText={action('small-change')}
      />
      <Input
        label="Medium Input"
        placeholder="Medium size"
        size="medium"
        onChangeText={action('medium-change')}
      />
      <Input
        label="Large Input"
        placeholder="Large size"
        size="large"
        onChangeText={action('large-change')}
      />
    </View>
  ),
};

export const FormExample: Story = {
  render: () => (
    <View style={{ gap: 16 }}>
      <Input
        label="First Name"
        placeholder="Enter your first name"
        required
        onChangeText={action('firstName-change')}
      />
      <Input
        label="Email Address"
        placeholder="Enter your email"
        required
        keyboardType="email-address"
        onChangeText={action('email-change')}
      />
      <Input
        label="Password"
        placeholder="Enter your password"
        required
        secureTextEntry
        helperText="Must be at least 8 characters"
        onChangeText={action('password-change')}
      />
      <Input
        label="Bio"
        placeholder="Tell us about yourself"
        multiline
        numberOfLines={3}
        showCharacterCount
        maxLength={200}
        onChangeText={action('bio-change')}
      />
    </View>
  ),
};