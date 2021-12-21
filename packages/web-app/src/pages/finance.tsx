import React from 'react';
import {useTranslation} from 'react-i18next';
import {withTransaction} from '@elastic/apm-rum-react';

import {
  PageWrapper,
  TokenSectionWrapper,
  TransferSectionWrapper,
} from 'components/wrappers';
import TokenList from 'components/tokenList';
import TransferList from 'components/transferList';
import {TimeFilter} from 'utils/constants';
import {useDaoTreasury} from 'hooks/useDaoTreasury';
import {useTransferModalContext} from 'context/transfersModal';

import type {Transfer} from 'utils/types';

const TEMP_TRANSFERS: Transfer[] = [
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
    title:
      'Deposit DAI so I can do whatever I want whenever I want and I really want this reference to be long',
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
  const {data: treasury} = useDaoTreasury('0xMyDaoAddress', TimeFilter.day);

  return (
    <div className={'m-auto mt-4 w-8/12'}>
      <PageWrapper
        title={new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(treasury.totalAssetValue)}
        buttonLabel={t('TransferModal.newTransfer')}
        subtitle={new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          signDisplay: 'always',
        }).format(treasury.totalAssetChange)}
        onClick={open}
        primary
      >
        <div className={'h-4'} />
        <TokenSectionWrapper title={t('finance.tokenSection')}>
          <div className="py-2 space-y-2 border-solid">
            <TokenList tokens={treasury.tokens} />
          </div>
        </TokenSectionWrapper>
        <div className={'h-4'} />
        <TransferSectionWrapper title={t('finance.transferSection')} showButton>
          <div className="py-2 space-y-2">
            <TransferList transfers={TEMP_TRANSFERS} />
          </div>
        </TransferSectionWrapper>
      </PageWrapper>
    </div>
  );
};

export default withTransaction('Finance', 'component')(Finance);
