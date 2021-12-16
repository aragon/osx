import React from 'react';
import styled from 'styled-components';
import {Link} from 'react-router-dom';
import {BreadcrumbData} from 'use-react-router-breadcrumbs';
import {IconChevronRight} from '@aragon/ui-components';

type Props = {
  breadcrumbs: BreadcrumbData[];
};
const Breadcrumbs: React.FC<Props> = ({breadcrumbs}) => {
  let isLast: boolean;

  return (
    <Container data-testid="breadcrumbs">
      {breadcrumbs.map(({breadcrumb, match, key}, index) => {
        isLast = index === breadcrumbs.length - 1;
        return (
          <Breadcrumb key={key}>
            <Link
              to={match.pathname}
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
    'flex flex-row items-center h-6 py-1 px-2 space-x-1.5 text-ui-600 bg-ui-0 rounded-xl font-bold',
})``;

const Breadcrumb = styled.div.attrs({
  className: 'flex flex-row items-center space-x-1.5',
})``;
