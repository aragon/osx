import React from 'react';
import {render, screen} from '@testing-library/react';

import {LinearProgress} from '../src';

describe('LinearProgress', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<LinearProgress {...args} />);
    return screen.getByRole('progressbar');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
