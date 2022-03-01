import React from 'react';
import styled from 'styled-components';
import {useNavigate} from 'react-router-dom';
import {ListItemAction} from '@aragon/ui-components';

import NavLink from 'components/navLink';
import useScreen from 'hooks/useScreen';
import {NAV_LINKS} from 'utils/constants';

type NavLinksProps = {
  onItemClick?: () => void;
};

const NavLinks: React.FC<NavLinksProps> = ({onItemClick}) => {
  const navigate = useNavigate();
  const {isDesktop} = useScreen();

  const handleOnClick = (to: string) => {
    onItemClick?.();
    navigate(to);
  };

  return (
    <StyledNavList data-testid="navLinks">
      {NAV_LINKS.map(item => (
        <li key={item.label}>
          <NavLink
            to={item.path}
            matchEnd={isDesktop}
            render={isSelected =>
              isDesktop ? (
                <NavItem
                  isSelected={isSelected}
                  onClick={() => handleOnClick(item.path)}
                >
                  {item.label}
                </NavItem>
              ) : (
                <ListItemAction
                  title={item.label}
                  iconLeft={<item.icon />}
                  onClick={() => handleOnClick(item.path)}
                  mode={isSelected ? 'selected' : 'default'}
                />
              )
            }
          />
        </li>
      ))}
    </StyledNavList>
  );
};

const StyledNavList = styled.ul.attrs({
  className:
    'space-y-1 desktop:space-y-0 desktop:flex desktop:space-x-1.5 desktop:items-center',
})``;

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
