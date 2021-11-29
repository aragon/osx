import React from 'react';
import {render, screen} from '@testing-library/react';

import {Simple as Input} from '../stories/Input.stories';

describe('Input', () => {
  function setup(args: any) {
    render(<Input {...args} />);
    return screen.getByTestId('input');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
