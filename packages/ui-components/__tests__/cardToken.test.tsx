import React from 'react';
import {render, screen} from '@testing-library/react';

import {CardToken} from '../src';

describe('CardToken', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<CardToken {...args} />);
    return screen.getByTestId('cardToken');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
