import React from 'react';
import styled from 'styled-components';
import {ButtonText, IconAdd} from '@aragon/ui-components';

import {SectionWrapperProps} from './sectionWrappers';

export type PageWrapperProps = SectionWrapperProps & {
  buttonLabel: string;
  subtitle: string;
  onClick?: () => void;
  primary?: boolean;
};

// NOTE: It's possible to merge these two components. But I'm not sure it makes
// things any simpler right now. However, if other sections wrappers like these
// are added in the future and all have similar style, feel free to merge them.

/**
 * finance Page wrapper. Consists of a header with a title and a
 * icon button.
 */
export const PageWrapper = ({
  title,
  children,
  buttonLabel,
  subtitle,
  onClick,
  primary = false,
}: PageWrapperProps) => {
  return (
    <>
      <HeaderContainer>
        <ContentWrapper>
          <PageTitle>{title}</PageTitle>
          <PageSubtitle {...{primary}}>{subtitle}</PageSubtitle>
        </ContentWrapper>
        <ActionWrapper>
          <ButtonText
            mode="primary"
            size="large"
            label={buttonLabel as string}
            iconLeft={<IconAdd />}
            onClick={onClick}
          />
        </ActionWrapper>
      </HeaderContainer>
      {children}
    </>
  );
};

type PageSubtitleProps = Pick<PageWrapperProps, 'primary'>;

const PageSubtitle = styled.p.attrs(({primary}: PageSubtitleProps) => ({
  className: `flex text-lg items-center text-lg ${
    primary ? 'text-primary-500' : 'text-ui-600'
  }`,
}))``;

const ActionWrapper = styled.div.attrs({
  className: 'h-100', // Fix button relative height
})``;

const HeaderContainer = styled.div.attrs({
  className: 'flex justify-between content-center',
})``;

const PageTitle = styled.p.attrs({
  className: 'flex text-lg font-bold items-center text-3xl text-ui-800',
})``;

const ContentWrapper = styled.div.attrs({
  className: 'flex flex-col space-y-2',
})``;
