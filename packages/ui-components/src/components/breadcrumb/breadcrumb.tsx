import React, {ReactComponentElement} from 'react';
import styled from 'styled-components';

import Crumb from './crumb';
import {BadgeProps} from '../badge';
import {ButtonIcon} from '../button';
import {IconChevronLeft, IconChevronRight, IconType} from '../icons';

export type CrumbType = {
  label: string;
  path: string;
};

export type DefaultCrumbProps = {
  /**
   * Array of breadcrumbs to be displayed; each breadcrumb should
   * include a label and its corresponding path
   */
  crumbs: CrumbType[];

  /** Base path icon to be displayed */
  icon: ReactComponentElement<IconType>;
};

export type ProcessCrumbProps = {
  crumbs: CrumbType;
  icon?: ReactComponentElement<IconType>;
};

export type BreadcrumbProps = {
  /** Tag shown at the end of the list of breadcrumbs */
  tag?: React.FunctionComponentElement<BadgeProps>;

  /** Callback returning the path value of the breadcrumb clicked */
  onClick?: (path: string) => void;
} & (ProcessCrumbProps | DefaultCrumbProps);

/** Component displaying given list as breadcrumbs. */
export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  crumbs,
  icon,
  tag,
  onClick,
}) => {
  if (Array.isArray(crumbs)) {
    let isLast: boolean;

    return (
      <Container data-testid="breadcrumbs">
        {crumbs.map(({label, path}, index) => {
          isLast = index === crumbs.length - 1;
          return (
            <>
              <Crumb
                first={index === 0}
                icon={icon}
                label={label}
                last={isLast}
                tag={tag}
                {...(isLast ? {} : {onClick: () => onClick?.(path)})}
              />
              {!isLast && <IconChevronRight className="text-ui-300" />}
            </>
          );
        })}
      </Container>
    );
  } else {
    return (
      <ProcessContainer data-testid="breadcrumbs">
        <ProcessCrumbContainer>
          <ButtonIcon
            mode="secondary"
            icon={<IconChevronLeft />}
            onClick={() => onClick?.(crumbs.path)}
            bgWhite
          />
          <p>{crumbs.label}</p>
          {tag}
        </ProcessCrumbContainer>
      </ProcessContainer>
    );
  }
};

const Container = styled.div.attrs({
  className:
    'inline-flex items-center py-0.5 desktop:px-2 space-x-1 ' +
    'desktop:space-x-1.5 h-5 desktop:h-6 desktop:bg-ui-0 desktop:rounded-xl',
})``;

const ProcessContainer = styled.div.attrs({
  className:
    'inline-flex py-0.5 desktop:pr-2 desktop:pl-0.5 desktop:rounded-xl desktop:bg-ui-0 h-6',
})``;

const ProcessCrumbContainer = styled.div.attrs({
  className: 'flex items-center space-x-1.5 font-bold text-ui-600',
})``;
