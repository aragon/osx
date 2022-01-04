import React from 'react';
import {render, screen} from '@testing-library/react';

import {CardText} from '../src';

describe('CardText', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<CardText {...args} />);
    return screen.getByTestId('card-text');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
