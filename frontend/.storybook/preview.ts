import type { Preview } from '@storybook/react';
import '../src/index.css';

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f8f8f8' },
        { name: 'dark',  value: '#1d2939' },
      ],
    },
  },
};

export default preview;
