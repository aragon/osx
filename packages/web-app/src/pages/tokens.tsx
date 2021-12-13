import React from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {withTransaction} from '@elastic/apm-rum-react';
import {
  ButtonText,
  IconAdd,
  SearchInput,
  TokenCard,
} from '@aragon/ui-components';

const tokens = [
  {
    tokenName: 'DAI',
    tokenSymbol: 'DAI',
    tokenImageUrl:
      'https://s2.coinmarketcap.com/static/img/coins/64x64/4943.png',
    treasurySharePercentage: '45%',
    tokenCount: '15,000,230.2323',
    tokenUSDValue: '$1',
    treasuryShare: '$15,000,230.2323',
    changeDuringInterval: '+$150,002.3',
    percentageChangeDuringInterval: '+ 0.01%',
  },
  {
    tokenName: 'Ethereum',
    tokenSymbol: 'ETH',
    tokenImageUrl:
      'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
    treasurySharePercentage: '15%',
    tokenCount: '500 ETH',
    tokenUSDValue: '$4777',
    treasuryShare: '$2,388,500',
    changeDuringInterval: '- $12,539.625',
    percentageChangeDuringInterval: '- 7.5%',
  },
];

const Tokens: React.FC = () => {
  const {t} = useTranslation();

  return (
    <Layout>
      <CenteredFlex>
        <div className="space-y-1">
          <Title>5 {t('finance.tokens')}</Title>
          <SubTitle>$469,657.98 Holdings</SubTitle>
        </div>
        <ButtonText
          size="large"
          label={t('finance.newTransfer')}
          iconLeft={<IconAdd />}
        />
      </CenteredFlex>
      <SearchInput placeholder="Type to filter" />
      <div className="space-y-1.5">
        {tokens.map((token, index) => (
          <TokenCard key={index} {...token} />
        ))}
      </div>
    </Layout>
  );
};

export default withTransaction('Tokens', 'component')(Tokens);

const Layout = styled.div.attrs({
  className: 'm-auto mt-5 space-y-5 w-8/12',
})``;

const CenteredFlex = styled.div.attrs({
  className: 'flex justify-between items-center',
})``;

const Title = styled.h1.attrs({
  className: 'text-2xl font-bold text-ui-800',
})``;

const SubTitle = styled.h2.attrs({
  className: 'text-lg font-semibold text-ui-500',
})``;
