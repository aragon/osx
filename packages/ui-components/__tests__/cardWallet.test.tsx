import React from 'react';
import {render, screen} from '@testing-library/react';

import {Default as CardWallet} from '../stories/cardWallet.stories';

describe('CardWallet', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<CardWallet {...args} />);
    return screen.getByTestId('cardWallet');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
