import React from 'react';
import { render, screen } from '@testing-library/react';

import { Badge } from '../src';

describe('Badge', () => {
  function setup(args: any) {
    render(<Badge {...args} />);
    return screen.getByRole('img');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
