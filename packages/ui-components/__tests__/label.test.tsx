import React from 'react';
import {render, screen} from '@testing-library/react';

import {Label} from '../src';

describe('Label', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<Label {...args} />);
    return screen.getByTestId('label');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
