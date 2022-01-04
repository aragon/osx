import React from 'react';
import styled from 'styled-components';

export type ActionItemProps = {
  /**
   * Whether list item is disabled
   */
  disabled?: boolean;

  /**
   * Icon to prepend to the button text
   */
  // eslint-disable-next-line
  icon: any; // TODO: set proper type

  /**
   * Whether item is currently selected
   */
  isSelected?: boolean;

  /**
   * Button text
   */
  label: string;

  /**
   * Whether item fits its container
   */
  wide?: boolean;
  onClick?: () => void;
};

/**
 * Action UI component
 */
export const ActionItem: React.FC<ActionItemProps> = ({
  disabled = false,
  icon,
  isSelected = false,
  label,
  wide = false,
  onClick,
}) => {
  return (
    <Container
      wide={wide}
      onClick={onClick}
      isSelected={isSelected}
      disabled={disabled}
      data-testid="actionItem"
    >
      <Content>
        <IconContainer>{icon}</IconContainer>
        <Label>{label}</Label>
      </Content>
    </Container>
  );
};

type ContainerProps = {isSelected: boolean; wide: boolean};
const Container = styled.button.attrs(({isSelected, wide}: ContainerProps) => ({
  className: `${wide && 'w-full'} rounded-xl py-1.5 px-2 ${
    isSelected ? 'text-primary-500 bg-primary-50' : 'text-ui-600 bg-ui-0'
  } hover:text-primary-500 active:bg-primary-50 disabled:text-ui-300 disabled:bg-ui-0 focus:outline-none focus:ring-2 focus:ring-primary-500`,
}))<ContainerProps>``;

const Label = styled.p.attrs({})``;

const Content = styled.div.attrs({
  className: 'flex items-center space-x-1.5',
})``;

const IconContainer = styled.div.attrs({
  className: 'flex justify-center items-center h-2 w-2',
})``;
