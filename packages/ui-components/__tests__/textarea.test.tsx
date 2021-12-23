import React from 'react';
import {render, screen} from '@testing-library/react';

import {TextareaSimple} from '../src';

describe('TextareaSimple', () => {
  function setup(args: any) {
    render(<TextareaSimple {...args} />);
    return screen.getByRole('textbox');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
