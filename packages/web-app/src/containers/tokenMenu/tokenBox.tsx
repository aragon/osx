import React, {useEffect, useState} from 'react';
import styled from 'styled-components';
import {Avatar} from '@aragon/ui-components';

import {useWallet} from 'context/augmentedWallet';
import {fetchBalance} from 'utils/tokens';

export type TokenProps = {
  tokenAddress: string;
  tokenName: string;
  tokenLogo: string;
};

export default function TokenBox({
  tokenAddress,
  tokenName,
  tokenLogo,
}: TokenProps) {
  const [balance, setBalance] = useState<string | null>(null);
  const [symbol, setSymbol] = useState<string | null>(null);
  const {account, provider} = useWallet();

  useEffect(() => {
    // Fetch balance amount for each token
    fetchBalance(tokenAddress, account as string, provider).then(
      tokenBalance => {
        setBalance(tokenBalance.amount);
        setSymbol(tokenBalance.symbol);
      }
    );
  }, [account, provider, tokenAddress]);

  // This condition will change later with skeleton loading integration
  // TODO: We should hide the 0 balance tokens later (it depends on
  // if we can fetch user token list or not)
  return balance ? (
    <Box>
      <TokenNameWrapper>
        <Avatar size="small" src={tokenLogo} />
        <Name>{tokenName}</Name>
      </TokenNameWrapper>
      <Price>{balance ? `${balance} ${symbol}` : '-'}</Price>
    </Box>
  ) : null;
}

const Box = styled.div.attrs({
  className: `flex justify-between py-1.5 px-2 
    bg-white rounded-xl cursor-pointer
    hover:text-ui-800 hover:bg-ui-100`,
})``;

const TokenNameWrapper = styled.div.attrs({
  className: 'flex space-x-2',
})``;

const Name = styled.h2.attrs({
  className: 'ft-text-lg text-ui-800 font-bold',
})``;

const Price = styled.h2.attrs({
  className: 'ft-text-lg text-ui-600',
})``;
