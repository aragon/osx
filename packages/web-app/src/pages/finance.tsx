import React from 'react';
import {useTranslation} from 'react-i18next';
import {withTransaction} from '@elastic/apm-rum-react';

import {
  TokenSectionWrapper,
  TransferSectionWrapper,
  PageWrapper,
} from 'components/wrappers';
import TokenList from 'components/tokenList';
import TransferList from 'components/transferList';
import usePollTokens from 'hooks/usePollTokens';
import {useDaoTokens} from 'hooks/useDaoTokens';
import {useTokenInfo} from 'hooks/useTokenInformation';
import {useTransferModalContext} from 'context/transfersModal';
import {Transfers} from 'utils/types';

const TEMP_TRANSFERS: Transfers[] = [
  {
    title: 'Deposit',
    tokenAmount: 300,
    tokenSymbol: 'DAI',
    transferDate: 'Pending...',
    transferType: 'Deposit',
    usdValue: '$200.00',
    isPending: true,
  },
  {
    title: 'Deposit DAI so I can do whatever I want whenever I want',
    tokenAmount: 300,
    tokenSymbol: 'DAI',
    transferDate: 'Yesterday',
    transferType: 'Deposit',
    usdValue: '$200.00',
  },
  {
    title: 'Withdraw',
    tokenAmount: 300,
    tokenSymbol: 'DAI',
    transferDate: 'Yesterday',
    transferType: 'Withdraw',
    usdValue: '$200.00',
  },
];

const Finance: React.FC = () => {
  const {t} = useTranslation();
  const {open} = useTransferModalContext();
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
          <div className="py-2 space-y-2">
            <TransferList transfers={TEMP_TRANSFERS} />
          </div>
        </TransferSectionWrapper>
      </PageWrapper>
    </div>
  );
};

export default withTransaction('Finance', 'component')(Finance);
