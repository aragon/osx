import React from 'react';
import {render, screen} from '@testing-library/react';

// TODO: add at setup
import '@testing-library/jest-dom/extend-expect';

import {Default as Popover} from '../stories/Popover.stories';

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
