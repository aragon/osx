import React from 'react';
import {render, screen} from '@testing-library/react';

import {Default as DaoCard} from '../stories/DaoCard.stories';

describe('DaoSelector', () => {
  function setup(args: any) {
    render(<DaoCard {...args} />);
    return screen.getByTestId('daoCard');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
