import React from 'react';
import {render, screen} from '@testing-library/react';

import {Wizard} from '../src';

describe('Wizard', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<Wizard {...args} />);
    return screen.getByTestId('wizard');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
