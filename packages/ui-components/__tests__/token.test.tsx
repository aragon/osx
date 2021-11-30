import React from 'react';
import { render, screen } from '@testing-library/react';

import { TokenCard } from '../src';

describe('TokenCard', () => {
  function setup(args: any) {
    render(<TokenCard {...args} />);
    return screen.getByTestId('tokenCard');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
