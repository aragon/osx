import React from 'react';
import {render, screen} from '@testing-library/react';

import {ListItemLink} from '../src';

describe('ListItemLink', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<ListItemLink {...args} />);
    return screen.getByTestId('listItem-link');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
