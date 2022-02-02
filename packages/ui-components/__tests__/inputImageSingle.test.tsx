import React from 'react';
import {render, screen} from '@testing-library/react';

import {Single as InputImageSingle} from '../stories/inputImageSingle.stories';

describe('inputImageSingle', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<InputImageSingle {...args} />);
    return screen.getByTestId('input-image');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
