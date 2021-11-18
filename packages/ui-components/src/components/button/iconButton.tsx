import React from 'react';
import styled from 'styled-components';

import {ButtonProps, StyledButton} from './button';

export type IconButtonProps = ButtonProps & {
  /** Wheter the icon is left or right of the label */
  side: 'left' | 'right';
  /** The icon's source */
  iconSrc: string;
};

/** Button with settable icon. The icon can be specified via its source and can
 * be but left or right of the lable. */
export const IconButton: React.FC<IconButtonProps> = ({
  mode = 'primary',
  size = 'default',
  side = 'left',
  iconSrc,
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
        <StyledIcon iconSrc={iconSrc} />
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
    className = 'flex items-center flex-row-reverse space-x-reverse space-x-2';
  return {className: className};
})<FlexDivProps>``;

type StyledIconProps = {
  iconSrc: IconButtonProps['iconSrc'];
};

const StyledIcon = styled.img.attrs(({iconSrc}: StyledIconProps) => {
  return {src: iconSrc, className: 'w-3 h-3'};
})<StyledIconProps>``;
