import React from 'react';
import {render, screen} from '@testing-library/react';

import {Default as CardDao} from '../stories/cardDao.stories';

describe('CardDao', () => {
  function setup(args: any) {
    render(<CardDao {...args} />);
    return screen.getByTestId('cardDao');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
