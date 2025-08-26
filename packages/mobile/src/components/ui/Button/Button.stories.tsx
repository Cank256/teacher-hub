// Note: Using any for now due to Storybook React Native type limitations
type Meta = any;
type StoryObj = any;
import { action } from '@storybook/addon-actions';
import Button from './Button';

const meta: Meta = {
  title: 'UI/Button',
  component: Button,
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'outline'],
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
