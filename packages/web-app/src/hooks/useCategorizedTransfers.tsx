// import {getDateSections} from 'utils/date';

import {useEffect, useState} from 'react';
import {HookData, Transfers} from 'utils/types';

export type CategorizedTransfer = {
  week: Transfers[];
  month: Transfers[];
  year: Transfers[];
};

/**
 * Split transfer data into three categories based on their date attribute.
 *
 * @return An object containing three array of transfers. One containing all
 * transfers before last month, one containing all transfer of the last month
 * (excluding the last week), and one containing only this weeks transfers.
 *
 */
export default function useCategorizedTransfers(): HookData<CategorizedTransfer> {
  // const sections = getDateSections(); // Sections will dynamically set based
  // on today date

  // Instead of using hard-coded data, this hook should eventually  get its data
  // from a graphQL client.

  const init: CategorizedTransfer = {
    week: [],
    month: [],
    year: [],
  };
  const [categorizedTransfers, setCategorizedTransfers] =
    useState<CategorizedTransfer>(init);

  useEffect(() => {
    const week: Transfers[] = [];
    const month: Transfers[] = [];
    const year: Transfers[] = [];

    transfers.forEach(t => {
      switch (t.transferDate) {
        case 'Yesterday':
          week.push(t);
          break;
        case 'Last Week':
          month.push(t);
          break;
        case 'Last Month':
          year.push(t);
          break;
        default:
          week.push(t);
          break;
      }
    });
    setCategorizedTransfers({
      week,
      month,
      year,
    });
  }, []);

  return {data: categorizedTransfers, isLoading: false};
}

const transfers: Array<Transfers> = [
  //this week -> today
  {
    title: 'Deposit',
    tokenAmount: 42,
    transferDate: 'Pending...',
    tokenSymbol: 'DAI',
    transferType: 'Deposit',
    usdValue: '$200.00',
    isPending: true,
  },
  {
    title: 'Deposit With some Reference',
    tokenAmount: 300,
    tokenSymbol: 'DAI',
    transferDate: 'Yesterday',
    transferType: 'Deposit',
    usdValue: '$200.00',
  },
  {
    title: 'Withdraw',
    tokenAmount: 1337,
    transferDate: 'Yesterday',
    tokenSymbol: 'DAI',
    transferType: 'Withdraw',
    usdValue: '$200.00',
    isPending: true,
  },
  //this month -> this week
  {
    title: 'Deposit',
    tokenAmount: 1,
    transferDate: 'Last Week',
    tokenSymbol: 'DAI',
    transferType: 'Deposit',
    usdValue: '$200.00',
  },
  {
    title: 'Deposit DAI so I can do whatever I want whenever I want',
    tokenAmount: 2,
    tokenSymbol: 'DAI',
    transferDate: 'Last Week',
    transferType: 'Deposit',
    usdValue: '$200.00',
  },
  {
    title: 'Withdraw',
    tokenAmount: 3,
    transferDate: 'Last Week',
    tokenSymbol: 'DAI',
    transferType: 'Withdraw',
    usdValue: '$200.00',
  },
  //this year -> this month
  {
    title: 'Deposit',
    tokenAmount: 1,
    transferDate: 'Last Month',
    tokenSymbol: 'DAI',
    transferType: 'Deposit',
    usdValue: '$200.00',
  },
  {
    title: 'Deposit DAI so I can do whatever I want whenever I want',
    tokenAmount: 2,
    tokenSymbol: 'DAI',
    transferDate: 'Last Month',
    transferType: 'Deposit',
    usdValue: '$200.00',
  },
  {
    title: 'Withdraw',
    tokenAmount: 3,
    transferDate: 'Last Month',
    tokenSymbol: 'DAI',
    transferType: 'Withdraw',
    usdValue: '$200.00',
  },
];
