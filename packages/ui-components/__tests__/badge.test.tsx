import React from 'react';
import {render, screen} from '@testing-library/react';

import {Badge} from '../src';

describe('Badge', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<Badge {...args} />);
    return screen.getByTestId('badge');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
