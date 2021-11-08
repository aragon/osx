import React from 'react';
import {render, screen} from '@testing-library/react';

// TODO: add at setup
import '@testing-library/jest-dom/extend-expect';

import {Default as Backdrop} from '../stories/Backdrop.stories';

describe('Backdrop', () => {
  function setup(args: any) {
    render(<Backdrop {...args} />);
    return screen.getByTestId('backdrop-container');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
