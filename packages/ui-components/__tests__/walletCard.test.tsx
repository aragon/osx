import React from 'react';
import {render, screen} from '@testing-library/react';

import {Default as WalletCard} from '../stories/walletCard.stories';

describe('WalletCard', () => {
  function setup(args: any) {
    render(<WalletCard {...args} />);
    return screen.getByTestId('walletCard');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
