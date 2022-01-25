import {Address} from '@aragon/ui-components/dist/utils/addresses';
import {useEffect, useState} from 'react';

import useIsMounted from 'hooks/useIsMounted';
import {HookData, Proposal} from 'utils/types';

/**
 * Hook that fetches all the dao proposals.
 *
 * NOTE: This hook currently returns static data. This data consists of 6
 * proposals.
 *
 * @param daoName Address of a DAO
 * @returns List of dao's proposals.
 */
export const useDaoProposals = (daoAddress: Address) => {
  const isMounted = useIsMounted();
  const [error, setError] = useState<Error>(); // eslint-disable-line
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    // TODO Fetch data from subgraph here
    if (daoAddress) 42;
    if (isMounted()) {
      setProposals(TEMP_PROPOSALS);
      setLoading(false);
    }
  }, [daoAddress, isMounted]);

  const res: HookData<Proposal[]> = {
    data: proposals,
    isLoading: loading,
  };
  return res;
};

// TEMPORARY, should eventually be obtained from a subgraph
const TEMP_PROPOSALS: Proposal[] = [
  {
    type: 'draft',
    title: 'Title',
    description: 'Description',
    publisherAddress: 'you',
  },
  {
    type: 'active',
    title: 'Title',
    description: 'Description',
    publisherAddress: '0x374d444487A4602750CA00EFdaC5d22B21F130E1',
    voteProgress: 64,
    voteLabel: 'Yes',
    tokenAmount: '3.5M',
    tokenSymbol: 'DNT',
    endAt: '1643801965',
  },
  {
    type: 'succeeded',
    title: 'Title',
    description: 'Description',
    publisherAddress: '0x374d444487A4602750CA00EFdaC5d22B21F130E1',
    endAt: '1643801965',
  },
  {
    type: 'pending',
    title: 'Title',
    description: 'Description',
    publisherAddress: '0x374d444487A4602750CA00EFdaC5d22B21F130E1',
    startAt: '1643801965',
  },
  {
    type: 'executed',
    title: 'Title',
    description: 'Description',
    publisherAddress: '0x374d444487A4602750CA00EFdaC5d22B21F130E1',
    endAt: '1643801965',
  },
  {
    type: 'defeated',
    title: 'Title',
    description: 'Description',
    publisherAddress: '0x374d444487A4602750CA00EFdaC5d22B21F130E1',
    endAt: '1643801965',
  },
  {
    type: 'active',
    title: 'Title',
    description: 'Description',
    publisherAddress: '0x374d444487A4602750CA00EFdaC5d22B21F130E1',
    voteProgress: 64,
    voteLabel: 'Yes',
    tokenAmount: '3.5M',
    tokenSymbol: 'DNT',
    endAt: '1643888365',
  },
  {
    type: 'active',
    title: 'Title',
    description: 'Description',
    publisherAddress: '0x374d444487A4602750CA00EFdaC5d22B21F130E1',
    voteProgress: 50,
    voteLabel: 'Yes',
    tokenAmount: '3.5M',
    tokenSymbol: 'DNT',
    endAt: '1644988365',
  },
];
