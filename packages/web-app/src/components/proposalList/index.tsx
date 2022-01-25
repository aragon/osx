import React from 'react';
import {CardProposal} from '@aragon/ui-components';
import {useTranslation} from 'react-i18next';
import {Proposal} from 'utils/types';
import {translateProposalDate} from '../../utils/date';

// types might come from subgraph - not adding any now
type ProposalListProps = {
  proposals: Array<Proposal>;
};

const ProposalList: React.FC<ProposalListProps> = ({proposals}) => {
  const {t} = useTranslation();

  if (proposals.length === 0)
    return <p data-testid="proposalList">{t('governance.noProposals')}</p>;

  return (
    <div className="space-y-3" data-testid="proposalList">
      {proposals.map((proposal, index) => {
        const AlertMessage = translateProposalDate(
          proposal.type,
          proposal.startAt || proposal.endAt || ''
        );
        return (
          <CardProposal
            title={proposal.title}
            description={proposal.description}
            onClick={() => null}
            state={proposal.type}
            voteTitle={t('governance.proposals.voteTitle') as string}
            {...(proposal.type === 'active' && {
              voteProgress: proposal.voteProgress,
              voteLabel: proposal.voteLabel,
              tokenAmount: proposal.tokenAmount,
              tokenSymbol: proposal.tokenSymbol,
            })}
            publishLabel={t('governance.proposals.publishedBy') as string}
            publisherAddress={proposal.publisherAddress}
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
            key={index}
          />
        );
      })}
    </div>
  );
};

export default ProposalList;
