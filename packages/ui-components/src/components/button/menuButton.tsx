import React from 'react';
import styled from 'styled-components';

import {IconMenu} from '../icons/interface/icon_menu';
import {SizedButton} from './button';
import {FlexDiv} from './iconButton';

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
        <IconMenu />
      </StyledButton>
    );
  }

  if (isOpen) {
    return (
      <OpenButton onClick={onClick} size={size}>
        <FlexDiv side={'left'}>
          <IconMenu />
          <p>Menu</p>
        </FlexDiv>
      </OpenButton>
    );
  } else {
    return (
      <StyledButton onClick={onClick} size={size}>
        <FlexDiv side={'left'}>
          <IconMenu />
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
