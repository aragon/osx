import React from 'react';
import {render, screen} from '@testing-library/react';

import {Default as Popover} from '../stories/popover.stories';

describe('Popover', () => {
  function setup(args: any) {
    render(<Popover {...args}>{args.children}</Popover>);
    return screen.getByTestId('popover-trigger');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
