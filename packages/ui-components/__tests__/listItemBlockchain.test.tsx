import React from 'react';
import {render, screen} from '@testing-library/react';

import {ListItemBlockchain} from '../src';

describe('ListItemBlockchain', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<ListItemBlockchain {...args} />);
    return screen.getByTestId(/blockchain/i);
  }

  test('should render without crashing', () => {
    const element = setup({logo: 'abd'});
    expect(element).toBeInTheDocument;
  });
});
