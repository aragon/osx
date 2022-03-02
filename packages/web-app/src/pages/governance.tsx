import React, {useState} from 'react';
import {withTransaction} from '@elastic/apm-rum-react';
import {
  Option,
  ButtonGroup,
  Pagination,
  ButtonText,
  IconAdd,
} from '@aragon/ui-components';
import {useNavigate} from 'react-router-dom';
import styled from 'styled-components';

import {PageWrapper} from 'components/wrappers';
import ProposalList from 'components/proposalList';
import NoProposals from 'public/noProposals.svg';
import {useDaoProposals} from '../hooks/useDaoProposals';
import {ProposalData} from 'utils/types';
import {useTranslation} from 'react-i18next';
import {Link} from '@aragon/ui-components/src';

const Governance: React.FC = () => {
  // TODO: toggle empty state based on graph query
  const [showEmptyState, setShowEmptyState] = useState(true);
  const [filterValue, setFilterValue] = useState<string>('all');
  const [page, setPage] = useState(1);
  const {data: daoProposals} = useDaoProposals('0x0000000000');
  const {t} = useTranslation();
  const navigate = useNavigate();
  // The number of proposals displayed on each page
  const ProposalsPerPage = 6;

  // This sort function should implement on graph side!
  function sortProposals(a: ProposalData, b: ProposalData): number {
    if (filterValue === 'active') {
      return (
        parseInt(a.vote.start as string) - parseInt(b.vote.start as string)
      );
    } else if (filterValue !== 'draft') {
      return parseInt(a.vote.end as string) - parseInt(b.vote.end as string);
    }
    return 1;
  }

  // TODO: this filter / sort function should implement using graph queries

  let displayedProposals: ProposalData[] = [];
  if (daoProposals.length > 0 && filterValue) {
    displayedProposals = daoProposals.filter(
      t => t.type === filterValue || filterValue === 'all'
    );
    displayedProposals.sort(sortProposals);
  }

  if (showEmptyState) {
    return (
      <>
        <EmptyStateContainer>
          <ImageContainer src={NoProposals} />
          <EmptyStateHeading>
            {t('governance.emptyState.title')}
          </EmptyStateHeading>
          <p className="mt-1.5 lg:w-1/2 text-center">
            {t('governance.emptyState.subtitleLine1')}{' '}
            {t('governance.emptyState.subtitleLine2')}{' '}
            <Link label={t('governance.emptyState.proposalGuide')} />
          </p>
          <ButtonText
            size="large"
            label="New Proposal"
            iconLeft={<IconAdd />}
            className="mt-4"
            onClick={() => navigate('/new-proposal')}
          />
        </EmptyStateContainer>

        <ButtonText
          label="Toggle Empty State"
          onClick={() => setShowEmptyState(false)}
          size="small"
          className="mx-auto mt-5"
        />
      </>
    );
  }

  // TODO: search functionality will implement later using graph queries
  return (
    <Container>
      <PageWrapper
        title={'Proposals'}
        buttonLabel={'New Proposal'}
        subtitle={'1 active Proposal'}
        onClick={() => navigate('/new-proposal')}
      >
        <div className="mt-8 space-y-1.5">
          <ButtonGroup
            bgWhite
            defaultValue="all"
            onChange={(selected: string) => {
              setFilterValue(selected);
              setPage(1);
            }}
          >
            <Option value="all" label="All" />
            <Option value="draft" label="Draft" />
            <Option value="pending" label="Pending" />
            <Option value="active" label="Active" />
            <Option value="succeeded" label="Succeeded" />
            <Option value="executed" label="Executed" />
            <Option value="defeated" label="Defeated" />
          </ButtonGroup>
        </div>
        <ListWrapper>
          <ProposalList
            proposals={displayedProposals.slice(
              (page - 1) * ProposalsPerPage,
              page * ProposalsPerPage
            )}
          />
        </ListWrapper>
        <PaginationWrapper>
          {displayedProposals.length > ProposalsPerPage && (
            <Pagination
              totalPages={
                Math.ceil(
                  displayedProposals.length / ProposalsPerPage
                ) as number
              }
              activePage={page}
              onChange={(activePage: number) => {
                setPage(activePage);
                window.scrollTo({top: 0, behavior: 'smooth'});
              }}
            />
          )}
        </PaginationWrapper>
      </PageWrapper>
    </Container>
  );
};

export default withTransaction('Governance', 'component')(Governance);

const Container = styled.div.attrs({
  className: 'm-auto mt-4 w-8/12',
})``;

const ListWrapper = styled.div.attrs({
  className: 'mt-3',
})``;

const PaginationWrapper = styled.div.attrs({
  className: 'flex mt-8 mb-10',
})``;

const EmptyStateContainer = styled.div.attrs({
  className:
    'flex flex-col items-center py-4 px-3 tablet:py-8 tablet:px-6 mx-auto mt-3 tablet:mt-5 w-11/12 tablet:w-3/4 text-lg bg-white rounded-xl text-ui-500',
})``;

const ImageContainer = styled.img.attrs({
  className: 'object-cover w-1/2',
})``;

const EmptyStateHeading = styled.h1.attrs({
  className: 'mt-4 text-2xl font-bold text-ui-800 text-center',
})``;
