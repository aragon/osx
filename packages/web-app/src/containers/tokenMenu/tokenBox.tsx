import React from 'react';
import styled from 'styled-components';
import {AvatarToken} from '@aragon/ui-components';

export type TokenProps = {
  tokenName: string;
  tokenLogo: string;
  tokenSymbol: string;
  tokenBalance: string;
};

export default function TokenBox({
  tokenName,
  tokenLogo,
  tokenSymbol,
  tokenBalance,
}: TokenProps) {
  return (
    <Box>
      <TokenNameWrapper>
        <AvatarToken size="medium" src={tokenLogo} />
        <Name>{tokenName}</Name>
      </TokenNameWrapper>
      <Price>{tokenBalance ? `${tokenBalance} ${tokenSymbol}` : '-'}</Price>
    </Box>
  );
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
