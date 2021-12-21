import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import React, {useState} from 'react';
import {withTransaction} from '@elastic/apm-rum-react';
import {Radio, RadioGroup, SearchInput} from '@aragon/ui-components';

import TransferList from 'components/transferList';
import {PageWrapper} from 'components/wrappers';
import useCategorizedTransfers from 'hooks/useCategorizedTransfers';
import {TransferSectionWrapper} from 'components/wrappers';
import {useTransferModalContext} from 'context/transfersModal';

const Transfers: React.FC = () => {
  const {t} = useTranslation();
  const {open} = useTransferModalContext();
  const [filterValue, setFilterValue] = useState('');
  const {data: categorizedTransfers} = useCategorizedTransfers();

  const handleButtonGroupChange = (selected: string) => {
    const val = selected === 'All' ? '' : selected;
    setFilterValue(val);
  };

  const displayedTransfers = {
    week: categorizedTransfers.week,
    month: categorizedTransfers.month,
    year: categorizedTransfers.year,
  };
  if (filterValue) {
    displayedTransfers.week = categorizedTransfers.week.filter(
      t => t.transferType === filterValue
    );
    displayedTransfers.month = categorizedTransfers.month.filter(
      t => t.transferType === filterValue
    );
    displayedTransfers.year = categorizedTransfers.year.filter(
      t => t.transferType === filterValue
    );
  }
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
        <div className="space-y-1.5">
          <SearchInput placeholder="Type to filter" />
          <RadioGroup defaultValue="All" onChange={handleButtonGroupChange}>
            <Radio value="All">All</Radio>
            <Radio value="Deposit">Deposit</Radio>
            <Radio value="Withdraw">Withdraw</Radio>
            <Radio value="External Contract">External Contract</Radio>
          </RadioGroup>
        </div>
        <SectionContainer>
          <TransferSectionWrapper title={t('allTransfer.thisWeek') as string}>
            <div className="my-2 space-y-1.5 border-solid">
              <TransferList transfers={displayedTransfers.week} />
            </div>
          </TransferSectionWrapper>
        </SectionContainer>
        <SectionContainer>
          <TransferSectionWrapper title={'December'}>
            <div className="my-2 space-y-1.5 border-solid">
              <TransferList transfers={displayedTransfers.month} />
            </div>
          </TransferSectionWrapper>
        </SectionContainer>
        <SectionContainer>
          <TransferSectionWrapper title={'2021'}>
            <div className="my-2 space-y-1.5 border-solid">
              <TransferList transfers={displayedTransfers.year} />
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
