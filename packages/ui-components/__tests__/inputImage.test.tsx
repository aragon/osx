import React from 'react';
import {render, screen} from '@testing-library/react';

import {Image as InputImage} from '../stories/inputImage.stories';

describe('inputImage', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<InputImage {...args} />);
    return screen.getByTestId('input-image');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
