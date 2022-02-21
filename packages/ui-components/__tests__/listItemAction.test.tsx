import React from 'react';
import {render, screen} from '@testing-library/react';

import {TwoIcons} from '../stories/listItemAction.stories';

describe('ListItemAction', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<TwoIcons {...args} />);
    return screen.getByTestId('listItem-action');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
