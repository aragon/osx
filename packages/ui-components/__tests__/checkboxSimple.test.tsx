import React from 'react';
import {render, screen} from '@testing-library/react';

import {CheckboxSimple} from '../src';

describe('CheckboxSimple', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<CheckboxSimple {...args} />);
    return screen.getByTestId('checkboxSimple');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
