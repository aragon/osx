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
};

/**
 * Action UI component
 */
export const ActionItem: React.FC<ActionItemProps> = ({
  disabled = false,
  icon,
  label,
  onClick,
}) => {
  return (
    <StyledActionItem
      onClick={onClick}
      disabled={disabled}
      data-testid="actionItem"
    >
      <Content>
        <IconContainer>{icon}</IconContainer>
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

const IconContainer = styled.div.attrs({
  className: 'flex justify-center items-center h-2 w-2 border',
})``;
