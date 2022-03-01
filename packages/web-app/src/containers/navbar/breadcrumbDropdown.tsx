import {
  ButtonIcon,
  CrumbType,
  Dropdown,
  IconClose,
  IconMenu,
  ListItemAction,
} from '@aragon/ui-components';
import React from 'react';
import styled from 'styled-components';

import NavLink from 'components/navLink';
import {NAV_LINKS} from 'utils/constants';

type BreadcrumbDropdownProps = {
  open: boolean;
  icon: JSX.Element;
  crumbs: CrumbType[];
  onClose?: () => void;
  onCrumbClick: (path: string) => void;
  onOpenChange?: (open: boolean) => void;
};

export const BreadcrumbDropdown: React.FC<BreadcrumbDropdownProps> = props => {
  return (
    <StyledDropdown
      align="start"
      trigger={
        <ButtonIcon
          mode="secondary"
          size="large"
          icon={props.open ? <IconClose /> : <IconMenu />}
          isActive={props.open}
        />
      }
      sideOffset={8}
      listItems={NAV_LINKS.map(item => ({
        component: (
          <NavLink
            to={item.path}
            matchEnd={false}
            render={selected => (
              <ListItemAction
                bgWhite
                title={item.label}
                mode={selected ? 'selected' : 'default'}
                iconLeft={<item.icon />}
              />
            )}
          />
        ),

        callback: () => props.onCrumbClick(item.path),
      }))}
    />
  );
};

const StyledDropdown = styled(Dropdown).attrs({
  className: 'p-1.5 w-30 rounded-xl',
})``;
