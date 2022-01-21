import '../src/styles/tailwind.css';
import {MINIMAL_VIEWPORTS} from '@storybook/addon-viewport';

const customViewports = {
  desktop: {
    name: 'Desktop',
    styles: {
      width: '1440px',
      height: '800px',
    },
  },
  wide: {
    name: 'Wide screen',
    styles: {
      width: '1920px',
      height: '800px',
    },
  },
};

export const parameters = {
  actions: {argTypesRegex: '^on[A-Z].*'},
  backgrounds: {
    default: 'neutral-50',
    values: [
      {
        name: 'neutral-50',
        value: '#F5F7FA',
      },
      {
        name: 'white',
        value: '#fff',
      },
      {
        name: 'neutral-900',
        value: '#1F2933',
      },
    ],
  },
  viewport: {
    viewports: {...MINIMAL_VIEWPORTS, ...customViewports}, // newViewports would be an ViewportMap. (see below for examples)
    defaultViewport: 'desktop',
  },
};
