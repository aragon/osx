import React from 'react';
import styled from 'styled-components';

import {IconType} from '../../';

export type MenuItemProps = {
  /**
   * Icon to prepend to the Menu item text
   */
  icon: IconType;

  /**
   * Menu item text
   */
  label: string;

  onClick?: () => void;
};

export const MenuItem: React.FC<MenuItemProps> = ({icon, label, onClick}) => {
  return (
    <Container onClick={onClick}>
      {/* TODO: Setup type guard */}
      <IconContainer>{icon}</IconContainer>
      <Label>{label}</Label>
    </Container>
  );
};

const Container = styled.button.attrs({
  className:
    'flex items-center px-1.5 py-2 space-x-1.5 text-ui-600 active:text-primary-500 hover:text-ui-800 focus:bg-ui-0 rounded-xl',
})``;

const IconContainer = styled.div.attrs({
  className: 'hidden justify-center items-center w-2 h-2',
})`
  ${Container}:active & {
    display: flex;
  }
`;

const Label = styled.p``;
