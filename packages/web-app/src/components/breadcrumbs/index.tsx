import React from 'react';
import styled from 'styled-components';
import {Link} from 'react-router-dom';
import {IconChevronRight} from '@aragon/ui-components';
import {BreadcrumbsRoute} from 'react-router-breadcrumbs-hoc';

type BreadcrumbsProps = {breadcrumbs: React.ReactNode[]};

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({breadcrumbs}) => {
  const crumbs = breadcrumbs as BreadcrumbsRoute[];
  let isLast: boolean;

  return (
    <Container data-testid="breadcrumbs">
      {crumbs.map(({match, key, breadcrumb}, index) => {
        isLast = index === breadcrumbs.length - 1;
        return (
          <Breadcrumb key={key}>
            <Link
              to={match.url}
              className={
                isLast ? 'text-ui-600 cursor-default' : 'text-primary-500'
              }
            >
              {breadcrumb}
            </Link>
            {!isLast && <IconChevronRight />}
          </Breadcrumb>
        );
      })}
    </Container>
  );
};

export default Breadcrumbs;

const Container = styled.div.attrs({
  className:
    'flex flex-row items-center py-1 px-2 space-x-1.5 text-ui-600 bg-ui-0 rounded-lg',
})``;

const Breadcrumb = styled.div.attrs({
  className: 'flex flex-row items-center space-x-1.5',
})``;
