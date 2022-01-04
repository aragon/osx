import React from 'react';
import {render, screen} from '@testing-library/react';

import {CardTransfer} from '../src';

describe('CardTransfer', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<CardTransfer {...args} />);
    return screen.getByTestId('cardTransfer');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
