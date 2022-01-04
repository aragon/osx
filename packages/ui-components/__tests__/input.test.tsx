import React from 'react';
import {render, screen} from '@testing-library/react';

import {Text as TextInput} from '../stories/input.stories';

describe('TextInput', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<TextInput {...args} />);
    return screen.getByTestId('input');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
