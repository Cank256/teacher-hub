import { view } from './storybook.requires';

const StorybookUIRoot = view.getStorybookUI({
  storage: {
    getItem: async (key: string) => {
      // Implement storage logic if needed
      return null;
    },
    setItem: async (key: string, value: string) => {
      // Implement storage logic if needed
    },
  },
});

export default StorybookUIRoot;