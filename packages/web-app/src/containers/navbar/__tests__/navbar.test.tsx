import React from 'react';
import {render, screen} from 'test-utils';

import Navbar from '..';

describe('Navbar', () => {
  test('should render', () => {
    render(<Navbar />);

    const element = screen.getByTestId(/nav/i);
    expect(element).toBeInTheDocument();
  });
});
