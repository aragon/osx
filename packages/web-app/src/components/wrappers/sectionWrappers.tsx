import React from 'react';
import styled from 'styled-components';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {ButtonText, IconChevronRight} from '@aragon/ui-components';

import {AllTokens, AllTransfers} from 'utils/paths';

export type SectionWrapperProps = {
  title: string;
  children: React.ReactNode;
};

/**
 * Section wrapper for tokens overview. Consists of a header with a title and a
 * button, as well as a footer with a button that takes the user to the token
 * overview. and a list of tokens (the children).
 *
 * NOTE: The wrapper imposes NO SPACING. It's entirely up to the children to
 * define this.
 */
export const TokenSectionWrapper = ({title, children}: SectionWrapperProps) => {
  const {t} = useTranslation();

  return (
    <>
      <HeaderContainer>
        <Title>{title}</Title>
      </HeaderContainer>
      {children}
      <Link to={AllTokens}>
        <ButtonText
          mode="secondary"
          label={t('labels.seeAllTokens')}
          iconRight={<IconChevronRight />}
        />
      </Link>
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
  const {t} = useTranslation();

  return (
    <>
      <HeaderContainer>
        <Title>{title}</Title>
      </HeaderContainer>
      {children}
      <Link to={AllTransfers}>
        <ButtonText
          mode="secondary"
          label={t('labels.seeAllTransfers')}
          iconRight={<IconChevronRight />}
        />
      </Link>
    </>
  );
};

const Title = styled.p.attrs({
  className: 'flex text-lg font-bold items-center',
})``;

const HeaderContainer = styled.div.attrs({
  className: 'flex justify-between content-center',
})``;
