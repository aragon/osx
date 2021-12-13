import React from 'react';
import styled from 'styled-components';
import {constants} from 'ethers';
import {useTranslation} from 'react-i18next';
import {withTransaction} from '@elastic/apm-rum-react';

import {
  TokenSectionWrapper,
  TransferSectionWrapper,
} from 'components/sectionWrapper';
import TokenList from 'components/tokenList';
import usePollTokens from 'hooks/usePollTokens';
import {DisplayToken} from 'utils/types';

// Temporary, should be gotten from subgraph or as props
const TEMP_TOKENS: DisplayToken[] = [
  {
    name: 'Ethereum',
    address: constants.AddressZero,
    imgUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
    count: 500,
    symbol: 'ETH',
    decimals: 18,
    changeDuringInterval: -12539.62,
    percentageChangeDuringInterval: '- 7.5%',
    treasurySharePercentage: 45,
  },
  {
    name: 'Dai',
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    imgUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/4943.png',
    count: 2551085,
    symbol: 'DAI',
    decimals: 18,
    changeDuringInterval: 150002.3,
    percentageChangeDuringInterval: '+ 0.01%',
    treasurySharePercentage: 55,
  },
  {
    name: 'Patito DAO Token',
    address: 'randomAddress',
    imgUrl: '',
    count: 500000,
    symbol: 'PDT',
    decimals: 18,
  },
];

const POLL_TOKEN_LIST = TEMP_TOKENS.map(({address, decimals}) => ({
  address,
  decimals,
}));

const Finance: React.FC = () => {
  const {t} = useTranslation();
  const {prices} = usePollTokens(POLL_TOKEN_LIST);

  return (
    <div className={'m-auto mt-4 w-8/12'}>
      <div className={'h-4'} />
      <TokenSectionWrapper title={t('finance.tokenSection')}>
        <div className="py-2 space-y-2 border-solid">
          <TokenList prices={prices} tokens={TEMP_TOKENS} />
        </div>
      </TokenSectionWrapper>
      <div className={'h-4'} />
      <TransferSectionWrapper title={t('finance.transferSection')}>
        <div className="my-2 space-y-2 border-solid">
          <ColoredDiv />
          <ColoredDiv />
          <ColoredDiv />
          <ColoredDiv />
          <ColoredDiv />
        </div>
      </TransferSectionWrapper>
    </div>
  );
};

export default withTransaction('Finance', 'component')(Finance);

const ColoredDiv = styled.div.attrs({className: 'h-6 w-full bg-blue-100'})``;
