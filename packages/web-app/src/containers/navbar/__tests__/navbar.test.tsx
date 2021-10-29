import React from 'react';
import {render, screen} from '@testing-library/react';

import Navbar from '..';

describe('Navbar', () => {
  test('should render', () => {
    render(<Navbar />);

    const element = screen.getByText(/navbar/i);
    expect(element).toBeVisible();
  });
});
