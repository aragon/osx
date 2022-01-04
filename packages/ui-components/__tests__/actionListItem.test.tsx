import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';

import {Default as ActionListItem} from '../stories/actionListItem.stories';

describe('ActionListItem', () => {
  // eslint-disable-next-line
  function setup(args?: any) {
    render(<ActionListItem {...args} />);
    return screen.getByTestId('actionListItem');
  }

  test('should render without crashing', () => {
    const element = setup();
    expect(element).toBeVisible;
  });

  test('should call the onClick method when clicked', () => {
    const mockHandler = jest.fn();
    const element = setup({onClick: mockHandler});

    fireEvent.click(element);

    expect(mockHandler).toHaveBeenCalledTimes(1);
  });
});
