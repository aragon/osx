import React, {useState} from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {withTransaction} from '@elastic/apm-rum-react';
import {ButtonText, IconAdd, SearchInput} from '@aragon/ui-components';

import TokenList from 'components/tokenList';
import {useDaoTokens} from 'hooks/useDaoTokens';
import usePollTokens from 'hooks/usePollTokens';
import {useTokenInfo} from 'hooks/useTokenInformation';
import {filterTokens} from 'utils/tokens';

const Tokens: React.FC = () => {
  const {t} = useTranslation();
  const {data: tokens} = useDaoTokens('0xMyDaoAddress');
  const {data: tokenInfos} = useTokenInfo(tokens);
  const {data: tokenPrices} = usePollTokens(tokenInfos);

  const [searchTerm, setSearchTerm] = useState('');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredInfo = filterTokens(tokenInfos, searchTerm);

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
      <SearchInput
        placeholder="Type to filter"
        value={searchTerm}
        onChange={handleChange}
      />
      <TokenList prices={tokenPrices} tokens={filteredInfo} />
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
