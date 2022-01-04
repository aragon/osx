import React from 'react';
import {render, screen} from '@testing-library/react';

import {Default as Spinner} from '../stories/spinner.stories';

describe('Spinner', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<Spinner {...args} />);
    return screen.getByTestId('spinner');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
