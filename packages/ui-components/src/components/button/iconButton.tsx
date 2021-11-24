import React from 'react';
import styled from 'styled-components';

import {ButtonProps, StyledButton} from './button';

export type IconButtonProps = ButtonProps & {
  /** Wheter the icon is left or right of the label */
  side: 'left' | 'right';
  /**
  * Icon to prepend to the button text
  */
  icon: any; // TODO: set proper type
};

/** Button with settable icon. The icon can be specified via its source and can
 * be but left or right of the lable. */
export const IconButton: React.FC<IconButtonProps> = ({
  mode = 'primary',
  size = 'default',
  side = 'left',
  icon,
  label,
  onClick,
  disabled,
  ...props
}) => {
  return (
    <StyledButton
      mode={mode}
      size={size}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      <FlexDiv side={side}>
        <StyledIconContainer>
          {icon}
        </StyledIconContainer>
        <p>{label}</p>
      </FlexDiv>
    </StyledButton>
  );
};

type FlexDivProps = {
  side: IconButtonProps['side'];
};

export const FlexDiv = styled.div.attrs(({side}: FlexDivProps) => {
  let className = 'flex items-center space-x-2';
  if (side === 'right')
    className = 'flex items-center flex-row-reverse space-x-reverse space-x-1.5';
  return {className: className};
})<FlexDivProps>``;

const StyledIconContainer = styled.div.attrs({
  className: 'flex items-center w-3 h-3'
})``;
