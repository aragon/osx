import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';

import {IconOnlyButton} from '../src';

describe('IconOnlyButton', () => {
  function setup(args?: any) {
    render(<IconOnlyButton {...args} />);
    return screen.getByRole('button');
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
