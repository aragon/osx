import React from 'react';
import {constants} from 'ethers';
import {render, screen} from 'test-utils';

import TokenList from '..';
import {BaseTokenInfo} from 'utils/types';

const DEFAULT_TOKENS: BaseTokenInfo[] = [
  {
    name: 'Ethereum',
    address: constants.AddressZero,
    imgUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
    count: BigInt('255555'),
    symbol: 'ETH',
    decimals: 18,
  },
];

describe('TokenList', () => {
  function setup(tokens = DEFAULT_TOKENS) {
    render(<TokenList tokens={tokens} />);
    return screen.getByTestId('tokenList');
  }

  test('should render without crashing', () => {
    const element = setup();
    expect(element).toBeInTheDocument();
  });

  test('should render token card for every token in the list', () => {
    const element = setup();
    expect(element.childElementCount).toBe(DEFAULT_TOKENS.length);
  });

  test('should render no tokens when list of token provided is empty', () => {
    setup([]);
    expect(screen.getByText(/no token/i)).toBeInTheDocument();
  });
});
