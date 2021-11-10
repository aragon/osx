import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';

// TODO: add at setup
import '@testing-library/jest-dom/extend-expect';

import {Button} from '../src/components/button';

describe('Button', () => {
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
