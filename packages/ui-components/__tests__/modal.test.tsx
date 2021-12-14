import React from 'react';
import {render, screen} from '@testing-library/react';

import {Default as Modal} from '../stories/modal.stories';

describe('Modal', () => {
  function setup(args: any) {
    render(<Modal {...args}>{args.children}</Modal>);
    return screen.getByTestId('modal-content');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
