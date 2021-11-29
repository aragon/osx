import React from 'react';
import styled from 'styled-components';

import {IconClose, IconMenu} from '../icons';
import {SizedButton} from './button';
import {FlexDiv} from './iconButton';

export type MenuButtonProps = {
  size: 'small' | 'default';
  /**
   * Changes the buttons appearance to either show a the menu icon or the a
   * cross icon. This state distinction is currently only available when
   * isMobile is false.
   */
  isOpen: boolean;
  /**
   * Button text
   */
  label: string;
  onClick: () => void;
};

// TODO: Should the button manage the open/close state from within?
// TODO: Add a isOpen state distinction to the mobile version as well, as soon as
// the design is finalized.
export const MenuButton = ({
  size = 'default',
  isOpen,
  label,
  ...props
}: MenuButtonProps) => {
  return (
    <Container size={size} isOpen={isOpen} {...props}>
      <FlexDiv side={'left'}>
        {isOpen ? <IconClose /> : <IconMenu />}
        <p className="hidden tablet:inline">{label}</p>
      </FlexDiv>
    </Container>
  );
};

type ContainerProps = {isOpen: boolean};
const Container = styled(SizedButton).attrs(({isOpen}: ContainerProps) => ({
  className: `bg-ui-0 ${
    isOpen ? 'text-primary-500' : 'text-ui-600'
  } active:text-primary-500 hover:text-ui-800`,
}))<ContainerProps>``;
