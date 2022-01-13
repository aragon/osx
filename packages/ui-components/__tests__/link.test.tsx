import React from 'react';
import {render, screen} from '@testing-library/react';

import {Link} from '../src';

describe('Link', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<Link {...args} />);
    return screen.getByTestId('link');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
