import React from 'react';
import styled from 'styled-components';

import {IconLinkExternal} from '../icons';

export type ListItemLinkProps =
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    /**
     * Optional link item label
     */
    label?: string;
    /**
     * Whether link opens up external page
     */
    external?: boolean;
  };

export const ListItemLink: React.FC<ListItemLinkProps> = ({
  external = true,
  ...props
}) => {
  return (
    <Container>
      <Link
        rel="noopener noreferrer"
        {...props}
        {...(external ? {target: '_blank'} : {})}
        data-testid="listItem-link"
      >
        <Title>{props.label ? props.label : props.href}</Title>
        <Icon />
      </Link>

      {props.label && <Subtitle>{props.href}</Subtitle>}
    </Container>
  );
};

const Container = styled.div.attrs({
  className: 'w-full',
})``;

const Link = styled.a.attrs({
  className: 'flex items-center min-w-0 text-primary-500' as string,
})``;

const Title = styled.p.attrs({
  className:
    'tablet:max-w-xs max-w-full overflow-hidden font-bold truncate whitespace-nowrap',
})``;

const Icon = styled(IconLinkExternal).attrs({className: 'ml-1 w-1.5 h-1.5'})``;

const Subtitle = styled.p.attrs({
  className: 'tablet:w-50 w-full text-sm text-ui-500 truncate',
})``;
