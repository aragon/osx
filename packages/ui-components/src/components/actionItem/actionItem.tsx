import React from 'react';
import styled from 'styled-components';

// import {IconType} from '../../';

export type ActionItemProps = {
  /**
   * Whether list item is disabled
   */
  disabled?: boolean;
  /**
   * Icon to prepend to the button text
   */
  // icon: IconType;
  icon: string; // TODO: set proper type
  /**
   * Button text
   */
  label: string;
  onClick?: () => void;
  /**
   * Shows the icon only when the ActionItem is active
   */
  toggleIcon?: boolean;
};

/**
 * Action UI component
 */
export const ActionItem: React.FC<ActionItemProps> = ({
  disabled = false,
  icon,
  label,
  onClick,
  toggleIcon = false,
}) => {
  return (
    <StyledActionItem
      onClick={onClick}
      disabled={disabled}
      data-testid="actionItem"
    >
      <Content>
        <IconContainer toggleIcon={toggleIcon}>{icon}</IconContainer>
        <Label>{label}</Label>
      </Content>
    </StyledActionItem>
  );
};

const StyledActionItem = styled.button.attrs({
  className: `rounded-xl font-semibold py-1.5 px-2 text-base text-ui-600 bg-ui-0
    hover:text-primary-500 active:bg-primary-50 disabled:text-ui-300 disabled:bg-ui-0`,
})``;

const Label = styled.p``;

const Content = styled.div.attrs({
  className: 'flex items-center space-x-1.5',
})``;

type IconContainerProps = {toggleIcon: boolean};
const IconContainer = styled.div.attrs({
  className: 'h-2 w-2 border',
})<IconContainerProps>`
  display: flex;
  align-items: center;
  justify-content: center;

  // If toggleIcon, hide icon on all states except for active
  ${({toggleIcon}) =>
    toggleIcon &&
    `display: none; 
     ${StyledActionItem}:active & {display: flex};
    `}
`;
