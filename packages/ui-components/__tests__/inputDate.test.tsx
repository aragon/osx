import React from 'react';
import {render, screen} from '@testing-library/react';

import {Date} from '../stories/inputDate.stories';

describe('TextInput', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<Date {...args} />);
    return screen.getByTestId('date-input');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
