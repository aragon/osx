import React from 'react';
import {render, screen} from '@testing-library/react';

import {Search as SearchInput} from '../stories/inputSearch.stories';

describe('inputSearch', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<SearchInput {...args} />);
    return screen.getByTestId('search-input');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
