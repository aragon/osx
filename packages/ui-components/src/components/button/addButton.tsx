import React from 'react';

import {IconAdd} from '../icons';
import {ButtonProps, StyledButton} from './button';
import {FlexDiv} from './iconButton';

/** Button to add stuff. Comes with a plus sign icon  */
export const AddButton: React.FC<ButtonProps> = ({
  mode = 'primary',
  size = 'default',
  disabled = false,
  label,
  onClick,
}) => {
  return (
    <StyledButton mode={mode} onClick={onClick} size={size} disabled={disabled}>
      <FlexDiv side={'left'}>
        <IconAdd />
        <p>{label}</p>
      </FlexDiv>
    </StyledButton>
  );
};
