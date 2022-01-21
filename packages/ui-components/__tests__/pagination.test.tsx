import React from 'react';
import {render, screen} from '@testing-library/react';

import {Default as Pagination} from '../stories/pagination.stories';

describe('Pagination', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<Pagination {...args}>{args.children}</Pagination>);
    return screen.getByTestId('pagination');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
