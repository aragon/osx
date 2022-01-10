import React from 'react';
import {render, screen} from '@testing-library/react';

import {TwoIcons} from '../stories/listItemText.stories';

describe('ListItemText', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<TwoIcons {...args} />);
    return screen.getByTestId('listItem-text');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
