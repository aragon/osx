import {Address} from '@aragon/ui-components/dist/utils/addresses';
import {useEffect, useState} from 'react';

import useIsMounted from 'hooks/useIsMounted';
import {HookData, ProposalData, UncategorizedProposalData} from 'utils/types';
import {getRemainingTime} from 'utils/date';

/**
 * Hook that fetches all the dao proposals.
 *
 * NOTE: This hook currently returns static data. This data consists of 6
 * proposals.
 *
 * @param daoName Address of a DAO
 * @returns (Potentially empty) List of dao's proposals.
 */
export function useDaoProposals(daoAddress: Address): HookData<ProposalData[]> {
  const isMounted = useIsMounted();
  const [error, setError] = useState<Error | undefined>();
  const [proposals, setProposals] = useState<ProposalData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // TODO extract this into graphQL query
    // eslint-disable-next-line
    async function fetchData(addr: Address) {
      return TEMP_PROPOSALS;
    }

    async function getProposals() {
      setLoading(true);
      try {
        if (isMounted()) {
          const data = await fetchData(daoAddress);
          const categorizedData = data.map(categorizeProposal);
          setProposals(categorizedData);
        }
      } catch (e) {
        if (isMounted()) {
          console.error(e);
          setError(new Error('Error fetching Proposals'));
        }
      } finally {
        setLoading(false);
      }
    }

    getProposals();
  }, [daoAddress, isMounted]);

  return {data: proposals, isLoading: loading, error};
}

/**
 * Takes and uncategorized proposal and categorizes it according to definitions.
 * @param uncategorizedProposal
 * @returns categorized proposal (i.e., uncategorizedProposal with additional
 * type field)
 */
function categorizeProposal(
  uncategorizedProposal: UncategorizedProposalData
): ProposalData {
  if (!uncategorizedProposal.metadata.published) {
    return {
      ...uncategorizedProposal,
      type: 'draft',
    };
  } else if (getRemainingTime(uncategorizedProposal.vote.start) >= 0) {
    return {
      ...uncategorizedProposal,
      type: 'pending',
    };
  } else if (getRemainingTime(uncategorizedProposal.vote.end) >= 0) {
    return {
      ...uncategorizedProposal,
      type: 'active',
    };
  } else if (uncategorizedProposal.metadata.executed) {
    return {
      ...uncategorizedProposal,
      type: 'executed',
    };
  } else if (
    uncategorizedProposal.vote.results.yes >
    uncategorizedProposal.vote.results.no
  ) {
    return {
      ...uncategorizedProposal,
      type: 'succeeded',
    };
  } else {
    return {
      ...uncategorizedProposal,
      type: 'defeated',
    };
  }
}

/* MOCK DATA ================================================================ */

// TEMPORARY, should eventually be obtained from a subgraph
const TEMP_PROPOSALS: UncategorizedProposalData[] = [
  {
    id: '100',
    metadata: {
      title: 'Draft Proposal',
      description: 'This is a draft proposal',
      publisher: 'you',
    },
    vote: {
      tokenSymbol: 'DNT',
      start: '1644988365',
      end: '1644988365',
      total: 0,
      results: {},
    },
    execution: {
      from: '0x1234567890123456789012345678901234567890',
      to: '0x1234567890123456789012345678901234567890',
      amount: 1,
    },
  },
  {
    id: '200',
    metadata: {
      title: 'Pending Proposal',
      description: 'This is a Pending proposal whose vote starts on march 1st',
      publisher: '0x374d444487A4602750CA00EFdaC5d22B21F130E1',
      published: {
        date: '1644988365',
        block: '123456789',
      },
      resources: [
        {
          title: 'Resource title',
          url: 'https://example.com',
        },
      ],
    },
    vote: {
      tokenSymbol: 'DNT',
      start: '1646133126',
      end: '1646123126',
      total: 0,
      results: {},
    },
    execution: {
      from: '0x1234567890123456789012345678901234567890',
      to: '0x1234567890123456789012345678901234567890',
      amount: 1,
    },
  },
  {
    id: '300',
    metadata: {
      title: 'Active Proposal',
      description:
        'This is an active proposal whose voting period ends mid february',
      publisher: '0x374d444487A4602750CA00EFdaC5d22B21F130E1',
      published: {
        date: '1645345158',
        block: '123456789',
      },
    },
    vote: {
      tokenSymbol: 'DNT',
      start: '1642666758',
      end: '1644923526',
      total: 100,
      results: {
        yes: 50,
        no: 50,
      },
    },
    execution: {
      from: '0x1234567890123456789012345678901234567890',
      to: '0x1234567890123456789012345678901234567890',
      amount: 1,
    },
  },
  {
    id: '400',
    metadata: {
      title: 'Succeeded Proposal',
      description: 'This is a succeeded proposal',
      publisher: '0x374d444487A4602750CA00EFdaC5d22B21F130E1',
      published: {
        date: '1639988358',
        block: '123456789',
      },
    },
    vote: {
      tokenSymbol: 'DNT',
      start: '1640333958',
      end: '1642666758',
      total: 100,
      results: {
        no: 10,
        yes: 90,
      },
    },
    execution: {
      from: '0x1234567890123456789012345678901234567890',
      to: '0x1234567890123456789012345678901234567890',
      amount: 1,
    },
  },
  {
    id: '500',
    metadata: {
      title: 'Executed Proposal',
      description: 'This is a executed proposal',
      publisher: '0x374d444487A4602750CA00EFdaC5d22B21F130E1',
      published: {
        date: '1639988358',
        block: '123456789',
      },
      resources: [
        {
          title: 'Resource title',
          url: 'https://example.com',
        },
      ],
      executed: {
        date: '1642925958',
        block: '123456789',
      },
    },
    vote: {
      tokenSymbol: 'DNT',
      start: '1640333958',
      end: '1642666758',
      total: 100,
      results: {
        yes: 90,
        no: 10,
      },
    },
    execution: {
      from: '0x1234567890123456789012345678901234567890',
      to: '0x1234567890123456789012345678901234567890',
      amount: 1,
    },
  },
  {
    id: '600',
    metadata: {
      title: 'Defeated Proposal',
      description: 'This is a defeated proposal',
      publisher: '0x374d444487A4602750CA00EFdaC5d22B21F130E1',
      published: {
        date: '1639988358',
        block: '123456789',
      },
    },
    vote: {
      tokenSymbol: 'DNT',
      start: '1640333958',
      end: '1642666758',
      total: 100,
      results: {
        yes: 10,
        no: 90,
      },
    },
    execution: {
      from: '0x1234567890123456789012345678901234567890',
      to: '0x1234567890123456789012345678901234567890',
      amount: 1,
    },
  },
  {
    id: '700',
    metadata: {
      title: 'Active Proposal',
      description: 'This is an active proposal whose vote ends on march 1st',
      publisher: '0x374d444487A4602750CA00EFdaC5d22B21F130E1',
      published: {
        date: '1645345158',
        block: '123456789',
      },
    },
    vote: {
      tokenSymbol: 'DNT',
      start: '1642666758',
      end: '1646133126',
      total: 200,
      results: {
        yes: 140,
        no: 60,
      },
    },
    execution: {
      from: '0x1234567890123456789012345678901234567890',
      to: '0x1234567890123456789012345678901234567890',
      amount: 1,
    },
  },
];
