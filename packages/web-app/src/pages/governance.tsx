import React, {useState} from 'react';
import {withTransaction} from '@elastic/apm-rum-react';
import {Option, ButtonGroup, Pagination} from '@aragon/ui-components';
import styled from 'styled-components';

import {PageWrapper} from 'components/wrappers';
import ProposalList from 'components/proposalList';
import {useDaoProposals} from '../hooks/useDaoProposals';
import {ProposalData} from 'utils/types';

const Governance: React.FC = () => {
  const [filterValue, setFilterValue] = useState<string>('all');
  const [page, setPage] = useState(1);
  const {data: daoProposals} = useDaoProposals('0x0000000000');
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

  // TODO: search functionality will implement later using graph queries
  return (
    <Container>
      <PageWrapper
        title={'Proposals'}
        buttonLabel={'New Proposal'}
        subtitle={'1 active Proposal'}
        onClick={() => null}
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
              onChange={(activePage: number) => setPage(activePage)}
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
