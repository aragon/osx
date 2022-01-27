import React from 'react';
import {CardProposal} from '@aragon/ui-components';
import {useTranslation} from 'react-i18next';
import {translateProposalDate} from '../../utils/date';
import {useNavigate} from 'react-router-dom';
import {ProposalData, VotingData} from 'utils/types';
import {useWalletProps} from 'containers/walletMenu';
import {useWallet} from 'context/augmentedWallet';

// types will come from subgraph and will need to be refactored.
type ProposalListProps = {
  proposals: Array<ProposalData>;
};

const ProposalList: React.FC<ProposalListProps> = ({proposals}) => {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const {chainId}: useWalletProps = useWallet();

  if (proposals.length === 0)
    return <p data-testid="proposalList">{t('governance.noProposals')}</p>;

  return (
    <div className="space-y-3" data-testid="proposalList">
      {proposals.map(proposal => {
        const AlertMessage = translateProposalDate(
          proposal.type,
          proposal.vote
        );
        return (
          <CardProposal
            title={proposal.metadata.title}
            description={proposal.metadata.description}
            onClick={() => {
              navigate('proposals/' + proposal.id);
            }}
            state={proposal.type}
            chainId={chainId}
            voteTitle={t('governance.proposals.voteTitle') as string}
            {...(proposal.type === 'active' && {
              voteProgress: getVoteResults(proposal.vote).toString(),
              voteLabel: proposal.vote.results.yes.toString(),
              tokenAmount: proposal.vote.total.toString(),
              tokenSymbol: proposal.vote.tokenSymbol,
            })}
            publishLabel={t('governance.proposals.publishedBy') as string}
            publisherAddress={proposal.metadata.publisher}
            StateLabel={[
              t('governance.proposals.states.draft'),
              t('governance.proposals.states.pending'),
              t('governance.proposals.states.active'),
              t('governance.proposals.states.executed'),
              t('governance.proposals.states.succeeded'),
              t('governance.proposals.states.defeated'),
            ]}
            {...(AlertMessage && {AlertMessage})}
            buttonLabel={[
              t('governance.proposals.buttons.read'),
              t('governance.proposals.buttons.vote'),
              t('governance.proposals.buttons.execute'),
              t('governance.proposals.buttons.edit'),
            ]}
            // FIXME: need add better keys when we start backend integration
            key={proposal.id}
          />
        );
      })}
    </div>
  );
};

function getVoteResults(votes: VotingData) {
  if (votes.results.total === 0) {
    return 0;
  }
  return Math.round((votes.results.yes / votes.total) * 100);
}

export default ProposalList;
