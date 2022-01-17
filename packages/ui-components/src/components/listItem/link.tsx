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
      <TitleContainer>
        <Link
          rel="noopener noreferrer"
          {...props}
          {...(external ? {target: '_blank'} : {})}
          data-testid="listItem-link"
        >
          {props.label ? props.label : props.href}
        </Link>
        <IconLinkExternal className="w-1.5 h-1.5" />
      </TitleContainer>
      {props.label && <Subtitle>{props.href}</Subtitle>}
    </Container>
  );
};

const Container = styled.div.attrs({
  className: 'w-full',
})``;

const Link = styled.a.attrs({
  className: 'truncate' as string,
})``;

const TitleContainer = styled.div.attrs({
  className: 'flex items-center space-x-1 font-bold text-primary-500',
})``;

const Subtitle = styled.p.attrs({
  className: 'text-sm text-ui-500 truncate',
})``;
