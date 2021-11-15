import React from 'react';
import styled from 'styled-components';

import {IconClose, IconMenu} from '../icons';
import {SizedButton} from './button';
import {FlexDiv} from './iconButton';

export type MenuButtonProps = {
  size: 'small' | 'default';
  /**
   * When set, the button will consist only of the menu icon, with no text.
   */
  isMobile: boolean;
  /**
   * Changes the buttons appearance to either show a the menu icon or the a
   * cross icon. This state distinction is currently only available when
   * isMobile is false.
   */
  isOpen: boolean;
  onClick: () => void;
};

// TODO Should the button manage the open/close state from within?
// TODO Add a isOpen state distinction to the mobile version as well, as soon as
// the design is finalized.
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
          <IconClose
            width={12}
            height={12}
            className="fill-current text-primary-500"
          />
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
  className: 'bg-ui-0 text-ui-600 border-2',
})``;
const OpenButton = styled(SizedButton).attrs({
  className: 'bg-ui-0 text-primary-500 border-2',
})``;
