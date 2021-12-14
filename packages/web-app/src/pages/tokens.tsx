import React, {useState} from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {withTransaction} from '@elastic/apm-rum-react';
import {SearchInput} from '@aragon/ui-components';
import {useTransferModalContext} from 'context/transfersModal';
import {PageWrapper} from 'components/wrappers';
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
  const {open} = useTransferModalContext();

  const [searchTerm, setSearchTerm] = useState('');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredInfo = filterTokens(tokenInfos, searchTerm);

  return (
    <Layout>
      <PageWrapper
        title={t('TransferModal.allTransfers') as string}
        buttonLabel={t('TransferModal.newTransfer') as string}
        subtitle={'$1,002,200.00 Total Volume'}
        onClick={open}
      >
        <SearchInput
          placeholder="Type to filter"
          value={searchTerm}
          onChange={handleChange}
        />
        <TokenList prices={tokenPrices} tokens={filteredInfo} />
      </PageWrapper>
    </Layout>
  );
};

export default withTransaction('Tokens', 'component')(Tokens);

const Layout = styled.div.attrs({
  className: 'm-auto mt-5 space-y-5 w-8/12',
})``;
