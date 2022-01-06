import React from 'react';
import {render, screen} from '@testing-library/react';

import {NumberInput} from '../src';

describe('NumberInput', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<NumberInput {...args} />);
    return screen.getByTestId('number-input');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
