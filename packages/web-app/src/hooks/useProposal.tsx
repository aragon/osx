import {Address} from '@aragon/ui-components/dist/utils/addresses';
import {useEffect, useState} from 'react';
import {HookData, UncategorizedProposalData} from 'utils/types';
import {useDaoProposals} from './useDaoProposals';

/**
 * NOTE: This file might only be temporary. At the moment it should be used to
 * mock data so we can display the UI. The data structure for the mockdata might
 * be wrong or incomplete. Please feel free to change it if you need.
 */

export function useProposal(
  daoAddress: Address,
  proposalId: string
): HookData<UncategorizedProposalData | undefined> {
  const {
    data: proposals,
    isLoading: isLoadingProposals,
    error: proposalsError,
  } = useDaoProposals(daoAddress);
  const [proposalData, setProposalData] = useState<
    UncategorizedProposalData | undefined
  >();
  const [isLoading, setIsLoading] = useState(isLoadingProposals);
  const [error, setError] = useState<Error | undefined>(proposalsError);

  useEffect(() => {
    // Fetch data for proposal. This will likely not be necessary, since we'll
    // handle this via Apollo Client. Currently this simply serves static data.
    const proposal = proposals.find(p => p.id === proposalId);
    if (proposal) {
      setProposalData(proposal);
      setError(undefined);
    } else {
      setError(new Error('Proposal not found'));
    }
    setIsLoading(false);
  }, [proposalId, proposals, isLoadingProposals, proposalsError]);

  return {data: proposalData, isLoading, error};
}
