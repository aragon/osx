import React from 'react';
import {render, screen} from '@testing-library/react';

import {AlertBanner} from '../src';

describe('AlertBanner', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<AlertBanner {...args} />);
    return screen.getByRole('alert');
  }

  test('should render without crashing', () => {
    const element = setup({label: 'Test Message'});
    expect(element).toBeInTheDocument;
    expect(screen.getByText(/test/i)).toBeInTheDocument;
  });
});
