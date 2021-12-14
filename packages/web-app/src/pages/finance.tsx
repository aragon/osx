import React from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {withTransaction} from '@elastic/apm-rum-react';

import {
  TokenSectionWrapper,
  TransferSectionWrapper,
  PageWrapper,
} from 'components/wrappers';
import TokenList from 'components/tokenList';
import usePollTokens from 'hooks/usePollTokens';
import {useDaoTokens} from 'hooks/useDaoTokens';
import {useTokenInfo} from 'hooks/useTokenInformation';

const Finance: React.FC = () => {
  const {t} = useTranslation();
  const {data: tokens} = useDaoTokens('0xMyDaoAddress');
  const {data: tokenInfos} = useTokenInfo(tokens);
  const {data: tokenPrices} = usePollTokens(tokenInfos);

  return (
    <div className={'m-auto mt-4 w-8/12'}>
      <PageWrapper
        title={'$469,657.98'}
        buttonLabel={t('TransferModal.newTransfer') as string}
        subtitle={'+ $120,200'}
        onClick={open}
        primary
      >
        <div className={'h-4'} />
        <TokenSectionWrapper title={t('finance.tokenSection')}>
          <div className="py-2 space-y-2 border-solid">
            <TokenList prices={tokenPrices} tokens={tokenInfos} />
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
      </PageWrapper>
    </div>
  );
};

export default withTransaction('Finance', 'component')(Finance);

const ColoredDiv = styled.div.attrs({className: 'h-6 w-full bg-blue-100'})``;
