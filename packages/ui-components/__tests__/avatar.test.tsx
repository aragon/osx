import React from 'react';
import {render, screen} from '@testing-library/react';

import {Circle as Avatar} from '../stories/avatar.stories';

describe('Avatar', () => {
  function setup(args: any) {
    render(<Avatar {...args} />);
    return screen.getByRole('img');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
