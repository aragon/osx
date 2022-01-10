import React from 'react';
import {render, screen} from '@testing-library/react';
import {Time} from '../stories/inputTime.stories';

describe('TimeInput', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<Time {...args} />);
    return screen.getByTestId('time-input');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
