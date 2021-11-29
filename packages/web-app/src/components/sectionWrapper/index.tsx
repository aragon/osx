import React from 'react';
import styled from 'styled-components';

import {Button, IconButton, IconLinkExternal} from '@aragon/ui-components';
import {useTranslation} from 'react-i18next';
import {Link} from 'react-router-dom';

export type SectionWrapperProps = {
  title: string;
  children: React.ReactNode;
};

// NOTE: It's possible to merge these two components. But I'm not sure it makes
// things any simpler right now. However, if other sections wrappers like these
// are added in the future and all have similar style, feel free to merge them.

/**
 * Section wrapper for tokens overview. Consists of a header with a title and a
 * button, as well as a footer with a button that takes the user to the token
 * overview. and a list of tokens (the children).
 *
 * NOTE: The wrapper imposes NO SPACING. It's entirely up to the children to
 * define this.
 */
export const TokenSectionWrapper = ({title, children}: SectionWrapperProps) => {
  return (
    <>
      <HeaderContainer>
        <Title>{title}</Title>
        <IconButton
          mode="ghost"
          size="small"
          side="right"
          label={'See on Explorer'}
          icon={<IconLinkExternal />}
          onClick={() => window.open('http://www.google.com', '_blank')}
        />
      </HeaderContainer>
      {children}
      <SeeAllButton />
    </>
  );
};

/**
 * Section wrapper for transfer overview. Consists of a header with a title, as
 * well as a footer with a button that takes the user to the token overview. and
 * a list of transfers (the children).
 *
 * NOTE: The wrapper imposes NO SPACING. It's entirely up to the children to
 * define this.
 */
export const TransferSectionWrapper = ({
  title,
  children,
}: SectionWrapperProps) => {
  return (
    <>
      <HeaderContainer>
        <Title>{title}</Title>
      </HeaderContainer>
      {children}
      <SeeAllButton />
    </>
  );
};

const SeeAllButton = () => {
  const {t} = useTranslation();
  return (
    <div>
      <Link to={'/governance'}>
        <Button mode={'ghost'} label={t('labels.seeAll')} />
      </Link>
    </div>
  );
};

const Title = styled.p.attrs({
  className: 'flex text-lg font-bold items-center',
})``;

const HeaderContainer = styled.div.attrs({
  className: 'flex justify-between content-center',
})``;
