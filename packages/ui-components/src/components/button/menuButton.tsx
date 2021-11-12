import React from 'react';
import styled from 'styled-components';

import {SizedButton} from './button';
import {FlexDiv, StyledIcon} from './iconButton';

export type MenuButtonProps = {
  size: 'small' | 'default';
  isMobile: boolean;
  isOpen: boolean;
  onClick: () => void;
};

// TODO Should the button manage the open/close state from within?
export const MenuButton = ({
  size = 'default',
  isMobile,
  isOpen,
  onClick,
}: MenuButtonProps) => {
  if (isMobile) {
    return (
      <StyledButton onClick={onClick} size={'default'}>
        <StyledIcon iconSrc="https://place-hold.it/150x150" />
      </StyledButton>
    );
  }

  if (isOpen) {
    return (
      <OpenButton onClick={onClick} size={size}>
        <FlexDiv side={'left'}>
          <StyledIcon iconSrc="https://place-hold.it/150x150" />
          <p>Menu</p>
        </FlexDiv>
      </OpenButton>
    );
  } else {
    return (
      <StyledButton onClick={onClick} size={size}>
        <FlexDiv side={'left'}>
          <StyledIcon iconSrc="https://place-hold.it/150x150" />
          <p>Menu</p>
        </FlexDiv>
      </StyledButton>
    );
  }
};

const StyledButton = styled(SizedButton).attrs({
  className: 'bg-ui-0',
})``;
const OpenButton = styled(SizedButton).attrs({
  className: 'bg-ui-0 text-primary-500',
})``;
