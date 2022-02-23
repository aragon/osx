import {
  IconGovernance,
  IconCommunity,
  IconDashboard,
  IconFinance,
  ListItemAction,
} from '@aragon/ui-components';
import React from 'react';
import styled from 'styled-components';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';

import NavLink from 'components/navLink';
import {Dashboard, Community, Finance, Governance} from 'utils/paths';

type NavLinksProps = {
  parent?: 'modal' | 'nav' | 'dropdown';
  onItemClick?: () => void;
};

// TODO: Investigate string interpolation with react-i18next
const NavLinks: React.FC<NavLinksProps> = ({parent = 'nav', onItemClick}) => {
  const {t} = useTranslation();
  const navigate = useNavigate();

  const handleOnClick = (to: string) => {
    onItemClick?.();
    navigate(to);
  };

  if (parent === 'nav')
    return (
      <StyledNavList data-testid="navLinks" parent={parent}>
        <li>
          <NavLink
            to={Dashboard}
            render={isSelected => (
              <NavItem
                isSelected={isSelected}
                onClick={() => handleOnClick(Dashboard)}
              >
                {t('navLinks.dashboard')}
              </NavItem>
            )}
          />
        </li>
        <li>
          <NavLink
            to={Governance}
            render={isSelected => (
              <NavItem
                isSelected={isSelected}
                onClick={() => handleOnClick(Governance)}
              >
                {t('navLinks.governance')}
              </NavItem>
            )}
          />
        </li>
        <li>
          <NavLink
            to={Finance}
            render={isSelected => (
              <NavItem
                isSelected={isSelected}
                onClick={() => handleOnClick(Finance)}
              >
                {t('navLinks.finance')}
              </NavItem>
            )}
          />
        </li>
        <li>
          <NavLink
            to={Community}
            render={isSelected => (
              <NavItem
                isSelected={isSelected}
                onClick={() => handleOnClick(Community)}
              >
                {t('navLinks.community')}
              </NavItem>
            )}
          />
        </li>
      </StyledNavList>
    );

  return (
    <StyledNavList parent={parent}>
      <li>
        <NavLink
          to={Dashboard}
          matchEnd={false}
          render={selected => (
            <ListItemAction
              iconLeft={<IconDashboard />}
              title={t('navLinks.dashboard')}
              onClick={() => handleOnClick(Dashboard)}
              {...(selected ? {mode: 'selected'} : {})}
              {...(parent === 'dropdown' ? {bgWhite: true} : {})}
            />
          )}
        />
      </li>
      <li>
        <NavLink
          to={Governance}
          matchEnd={false}
          render={selected => (
            <ListItemAction
              iconLeft={<IconGovernance />}
              title={t('navLinks.governance')}
              onClick={() => handleOnClick(Governance)}
              {...(selected ? {mode: 'selected'} : {})}
              {...(parent === 'dropdown' ? {bgWhite: true} : {})}
            />
          )}
        />
      </li>
      <li>
        <NavLink
          to={Finance}
          matchEnd={false}
          render={selected => (
            <ListItemAction
              iconLeft={<IconFinance />}
              title={t('navLinks.finance')}
              onClick={() => handleOnClick(Finance)}
              {...(selected ? {mode: 'selected'} : {})}
              {...(parent === 'dropdown' ? {bgWhite: true} : {})}
            />
          )}
        />
      </li>
      <li>
        <NavLink
          to={Community}
          matchEnd={false}
          render={selected => (
            <ListItemAction
              iconLeft={<IconCommunity />}
              title={t('navLinks.community')}
              onClick={() => handleOnClick(Community)}
              {...(selected ? {mode: 'selected'} : {})}
              {...(parent === 'dropdown' ? {bgWhite: true} : {})}
            />
          )}
        />
      </li>
    </StyledNavList>
  );
};

type ParentProps = NonNullable<Pick<NavLinksProps, 'parent'>>;
const StyledNavList = styled.ul.attrs(({parent}: ParentProps) => {
  let className = '';

  switch (parent) {
    case 'nav':
      className = 'flex space-x-1.5 items-center';
      break;
    case 'modal':
      className = 'space-y-1';
      break;
    case 'dropdown':
      className = 'space-y-1 p-1.5  ';
      break;
  }

  return {className};
})<ParentProps>``;

const NavItem = styled.button.attrs(({isSelected}: {isSelected: boolean}) => {
  let className =
    'py-1.5 px-2 rounded-xl font-bold hover:text-primary-500 ' +
    'active:text-primary-700 disabled:text-ui-300 disabled:bg-ui-50' +
    ' focus:ring-2 focus:ring-primary-500 focus:outline-none ';

  if (isSelected) className += 'text-primary-500 bg-ui-0';
  else className += 'text-ui-600';

  return {className};
})<{isSelected: boolean}>``;

export default NavLinks;
