import React from 'react';
import styled from 'styled-components';
import useBreadcrumbs from 'use-react-router-breadcrumbs';
import {Breadcrumb, ButtonText, IconAdd} from '@aragon/ui-components';

import useScreen from 'hooks/useScreen';
import {basePathIcons} from 'containers/navbar/desktop';
import {SectionWrapperProps} from './sectionWrappers';
import {Dashboard, NotFound} from 'utils/paths';
import {useNavigate} from 'react-router-dom';

export type PageWrapperProps = SectionWrapperProps & {
  buttonLabel: string;
  subtitle: string;
  onClick?: () => void;
};

// NOTE: It's possible to merge these two components. But I'm not sure it makes
// things any simpler right now. However, if other sections wrappers like these
// are added in the future and all have similar style, feel free to merge them.

/**
 * Non proposal page wrapper. Consists of a header with a title and a
 * icon button.
 */
export const PageWrapper = ({
  title,
  children,
  buttonLabel,
  subtitle,
  onClick,
}: PageWrapperProps) => {
  const {isDesktop} = useScreen();
  const navigate = useNavigate();

  const breadcrumbs = useBreadcrumbs(undefined, {
    excludePaths: [Dashboard, NotFound, 'governance/proposals'],
  }).map(item => ({
    path: item.match.pathname,
    label: item.breadcrumb as string,
  }));

  return (
    <>
      <HeaderContainer>
        {!isDesktop && (
          <Breadcrumb
            icon={basePathIcons[breadcrumbs[0].path]}
            crumbs={breadcrumbs}
            onClick={navigate}
          />
        )}
        <ContentWrapper>
          <TextWrapper>
            <PageTitle>{title}</PageTitle>
            <PageSubtitle>{subtitle}</PageSubtitle>
          </TextWrapper>

          <ButtonText
            size="large"
            label={buttonLabel}
            iconLeft={<IconAdd />}
            className="w-full tablet:w-auto"
            onClick={onClick}
          />
        </ContentWrapper>
      </HeaderContainer>

      {children}
    </>
  );
};

const PageSubtitle = styled.p.attrs({
  className: 'mt-1 text-lg text-ui-600',
})``;

const TextWrapper = styled.div.attrs({
  className: 'tablet:flex-1',
})``;

const HeaderContainer = styled.div.attrs({
  className:
    'flex flex-col gap-y-2 tablet:gap-y-3 desktop:p-0 px-2 tablet:px-3 pt-2' +
    ' desktop:pt-0 pb-3 bg-ui-0 desktop:bg-transparent' +
    ' tablet:rounded-xl desktop:rounded-none',
})``;

const PageTitle = styled.p.attrs({
  className: 'text-3xl font-bold text-ui-800 ft-text-3xl',
})``;

const ContentWrapper = styled.div.attrs({
  className:
    'tablet:flex tablet:justify-between tablet:items-start' +
    ' space-y-2 tablet:space-y-0 tablet:space-x-3',
})``;
