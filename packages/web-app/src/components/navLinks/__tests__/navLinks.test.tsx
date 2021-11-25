import React from 'react';
import {render, screen} from 'test-utils';

import NavLinks from '..';

describe('NavLinks', () => {
  test('should render', () => {
    render(<NavLinks />);

    const element = screen.getByTestId(/navLinks/i);
    expect(element).toBeInTheDocument();
  });
});
