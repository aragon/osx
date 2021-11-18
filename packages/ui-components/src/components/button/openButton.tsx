import React from 'react';

import {IconChevronDown} from '../icons';
import {ButtonProps, StyledButton} from './button';
import {FlexDiv} from './iconButton';

/** Button used to open dropdowns or popovers. Comes with a downward-facing
 * arrowhead icon  */
export const OpenButton: React.FC<ButtonProps> = ({
  mode = 'primary',
  size = 'default',
  disabled = false,
  label,
  onClick,
}) => {
  // TODO make component keep track of open/closed state and change icon acordingly.
  return (
    <StyledButton mode={mode} onClick={onClick} size={size} disabled={disabled}>
      <FlexDiv side={'right'}>
        <IconChevronDown />
        <p>{label}</p>
      </FlexDiv>
    </StyledButton>
  );
};
