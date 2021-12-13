import React from 'react';
import {render, screen} from '@testing-library/react';

import {Backdrop} from '../src';

describe('Backdrop', () => {
  function setup(args: any) {
    render(<Backdrop {...args} />);
    return screen.getByTestId('backdrop-container');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
