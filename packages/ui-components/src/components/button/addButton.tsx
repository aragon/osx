import React from 'react';

import {IconAdd} from '../icons';
import {ButtonProps, StyledButton} from './button';
import {FlexDiv} from './iconButton';

/** Button to add stuff. Comes with a plus sign icon  */
export const AddButton: React.FC<ButtonProps> = ({
  label,
  mode = 'primary',
  size = 'default',
  ...props
}) => {
  return (
    <StyledButton mode={mode} size={size} {...props}>
      <FlexDiv side={'left'}>
        <IconAdd />
        <p>{label}</p>
      </FlexDiv>
    </StyledButton>
  );
};
