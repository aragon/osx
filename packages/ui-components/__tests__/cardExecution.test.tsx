import React from 'react';
import {render, screen} from '@testing-library/react';

import {CardExecution} from '../src';

describe('cardExecution', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<CardExecution {...args} />);
    return screen.getByTestId('cardExecution');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
