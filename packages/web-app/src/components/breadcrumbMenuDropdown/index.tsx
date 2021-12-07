import React from 'react';
import styled from 'styled-components';

import NavLinks from 'components/navLinks';

type MenuDropdownProps = {selected?: string; onItemClick?: () => void};

const MenuDropdown: React.FC<MenuDropdownProps> = ({selected, onItemClick}) => {
  return (
    <Container>
      <NavLinksContainer>
        <NavLinks selected={selected} onItemClick={onItemClick} isDropdown />
      </NavLinksContainer>
    </Container>
  );
};

export default MenuDropdown;

const Container = styled.div.attrs({
  className: 'py-3 px-2 text-ui-600',
})``;

const NavLinksContainer = styled.div.attrs({
  className: 'flex flex-col space-y-1.5',
})``;
