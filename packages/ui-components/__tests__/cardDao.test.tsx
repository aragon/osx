import React from 'react';
import {render, screen} from '@testing-library/react';

import {Default as CardDao} from '../stories/cardDao.stories';

describe('CardDao', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<CardDao {...args} daoName={'daoName'} />);
    return screen.getByTestId('cardDao');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
