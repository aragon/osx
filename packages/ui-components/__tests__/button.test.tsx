import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';

import {ButtonBase as Button} from '../src/components/button/buttonBase';

describe('Button', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<Button label="test" {...args} />);
    return screen.getByRole('button');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });

  test('should call the onClick method when clicked', () => {
    const mockHandler = jest.fn();
    const element = setup({onClick: mockHandler});

    fireEvent.click(element);
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });
});
