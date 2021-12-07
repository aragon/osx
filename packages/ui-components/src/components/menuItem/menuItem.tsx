import React from 'react';
import styled from 'styled-components';

export type MenuItemProps = {
  /**
   * Icon to prepend to the Menu item text
   */

  icon: any; // TODO: set up proper type

  /**
   * Whether the current item is active
   */
  isSelected?: boolean;

  /**
   * Menu item text
   */
  label: string;

  onClick?: () => void;
};

export const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  isSelected = false,
  label,
  onClick,
}) => {
  return (
    <Container onClick={onClick} isSelected={isSelected} data-testid="menuItem">
      {isSelected && <IconContainer>{icon}</IconContainer>}
      <Label>{label}</Label>
    </Container>
  );
};

type ContainerProp = {isSelected: boolean};
const Container = styled.button.attrs(({isSelected}: ContainerProp) => ({
  className: `flex items-center py-1 px-2 space-x-1.5 ${
    isSelected ? 'text-primary-500 bg-ui-0' : 'text-ui-600 hover:text-ui-800'
  } active:text-primary-500 focus:bg-ui-0 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-xl`,
}))<ContainerProp>`
  cursor: pointer;
`;

const IconContainer = styled.div.attrs({
  className: 'flex justify-center items-center w-2 h-2',
})``;

const Label = styled.p``;
