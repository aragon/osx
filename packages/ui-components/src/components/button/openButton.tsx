import React from 'react';

import {IconChevronDown} from '../icons';
import {ButtonProps, StyledButton} from './button';
import {FlexDiv} from './iconButton';

/** Button used to open dropdowns or popovers. Comes with a downward-facing
 * arrowhead icon  */
export const OpenButton: React.FC<ButtonProps> = ({
  mode = 'primary',
  size = 'default',
  label,
  ...props
}) => {
  // TODO make component keep track of open/closed state and change icon acordingly.
  return (
    <StyledButton mode={mode} size={size} {...props}>
      <FlexDiv side={'right'}>
        <IconChevronDown />
        <p>{label}</p>
      </FlexDiv>
    </StyledButton>
  );
};
