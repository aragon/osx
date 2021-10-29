import React from 'react';
import {render, screen} from '@testing-library/react';

import Footer from '..';

describe('Footer', () => {
  test('should render', () => {
    render(<Footer />);

    const element = screen.getByText(/footer/i);
    expect(element).toBeVisible();
  });
});
