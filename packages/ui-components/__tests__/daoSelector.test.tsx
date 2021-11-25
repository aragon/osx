import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';

import {Default as DaoSelector} from '../stories/daoSelector.stories';

describe('DaoSelector', () => {
  function setup(args: any) {
    render(<DaoSelector label="test" {...args} />);
    return screen.getByTestId('daoSelector');
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
