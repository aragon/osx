import {SearchInput} from '@aragon/ui-components';
import React from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {withTransaction} from '@elastic/apm-rum-react';

import {TransferSectionWrapper} from 'components/wrappers';
import useCategorizedTransfers, {
  TransferSectionsType,
} from 'hooks/useCategorizedTransfers';
import {useTransferModalContext} from 'context/transfersModal';
import {PageWrapper} from 'components/wrappers';
import TransferList from 'components/transferList';
import {Transfers} from 'utils/types';

const transfers: Array<Transfers> = [
  {
    title: 'Deposit',
    tokenAmount: 300,
    transferDate: 'Pending...',
    tokenSymbol: 'DAI',
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
    transferDate: 'Yesterday',
    tokenSymbol: 'DAI',
    transferType: 'Withdraw',
    usdValue: '$200.00',
  },
];

const Transfers: React.FC = () => {
  const {t} = useTranslation();
  const transfersList: TransferSectionsType = useCategorizedTransfers();
  const {open} = useTransferModalContext();

  /**
   * Note: We can add a nested iterator for both sections and transfer cards
   */

  return (
    <Layout>
      <PageWrapper
        title={t('TransferModal.allTransfers') as string}
        buttonLabel={t('TransferModal.newTransfer') as string}
        subtitle={'$1,002,200.00 Total Volume'}
        onClick={open}
      >
        <SearchInput placeholder="Type to filter" />
        <SectionContainer>
          <TransferSectionWrapper title={t('allTransfer.thisWeek') as string}>
            <div className="my-2 space-y-2 border-solid">
              {transfersList.week.map((data, index) => (
                <TransferList transfers={transfers} key={index} />
              ))}
            </div>
          </TransferSectionWrapper>
        </SectionContainer>
        <SectionContainer>
          <TransferSectionWrapper title={'December'}>
            <div className="my-2 space-y-2 border-solid">
              {transfersList.month.map((data, index) => (
                <TransferList transfers={transfers} key={index} />
              ))}
            </div>
          </TransferSectionWrapper>
        </SectionContainer>
        <SectionContainer>
          <TransferSectionWrapper title={'2021'}>
            <div className="my-2 space-y-2 border-solid">
              {transfersList.year.map((data, index) => (
                <TransferList transfers={transfers} key={index} />
              ))}
            </div>
          </TransferSectionWrapper>
        </SectionContainer>
      </PageWrapper>
    </Layout>
  );
};

const Layout = styled.div.attrs({
  className: 'm-auto mt-5 space-y-5 w-8/12',
})``;
const SectionContainer = styled.div.attrs({className: 'my-5'})``;

export default withTransaction('Transfers', 'component')(Transfers);
