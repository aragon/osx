import styled from 'styled-components';
import {SearchInput} from '@aragon/ui-components';
import {useTranslation} from 'react-i18next';
import {withTransaction} from '@elastic/apm-rum-react';
import React, {useState} from 'react';

import TokenList from 'components/tokenList';
import {TimeFilter} from 'utils/constants';
import {PageWrapper} from 'components/wrappers';
import {filterTokens} from 'utils/tokens';
import {useDaoTreasury} from 'hooks/useDaoTreasury';
import {useGlobalModalContext} from 'context/globalModals';
import type {TreasuryToken} from 'utils/types';

const Tokens: React.FC = () => {
  const {t} = useTranslation();
  const {open} = useGlobalModalContext();
  const {data: treasury} = useDaoTreasury('0xMyDaoAddress', TimeFilter.day);

  const [searchTerm, setSearchTerm] = useState('');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredInfo: TreasuryToken[] = filterTokens(
    treasury.tokens,
    searchTerm
  );

  return (
    <Layout>
      <PageWrapper
        title={t('TransferModal.allTransfers') as string}
        buttonLabel={t('TransferModal.newTransfer') as string}
        subtitle={`${new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(treasury.totalAssetValue)} Total Volume`}
        onClick={open}
      >
        <SearchInput
          placeholder="Type to filter"
          value={searchTerm}
          onChange={handleChange}
        />
        <TokenList tokens={filteredInfo} />
      </PageWrapper>
    </Layout>
  );
};

export default withTransaction('Tokens', 'component')(Tokens);

const Layout = styled.div.attrs({
  className: 'm-auto mt-5 space-y-5 w-8/12',
})``;
