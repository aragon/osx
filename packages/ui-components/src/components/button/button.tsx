import React, {ButtonHTMLAttributes} from 'react';
import styled from 'styled-components';

// Simple Button ===============================================================

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Changes a button's color scheme */
  mode: 'primary' | 'secondary' | 'tertiary' | 'ghost';
  /** Changes a button's size */
  size: 'small' | 'default';
  /** Text displayed on the button */
  label: string;
};

/** Simple button with variable styling (depending on mode) and variable sizin */
export const SimpleButton: React.FC<ButtonProps> = ({
  mode = 'primary',
  size = 'default',
  label,
  onClick,
  disabled,
}) => {
  return (
    <StyledButton mode={mode} size={size} onClick={onClick} disabled={disabled}>
      {label}
    </StyledButton>
  );
};

// ICON BUTTON ================================================================

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
}) => {
  return (
    <StyledButton mode={mode} size={size} onClick={onClick} disabled={disabled}>
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

const FlexDiv = styled.div.attrs(({side}: FlexDivProps) => {
  let className = 'flex space-x-2';
  if (side === 'left') className = 'flex space-x-2';
  else className = 'flex flex-row-reverse space-x-reverse space-x-2';
  return {className: className};
})<FlexDivProps>``;

type StyledIconProps = {
  iconSrc: IconButtonProps['iconSrc'];
};

const StyledIcon = styled.img.attrs(({iconSrc}: StyledIconProps) => {
  return {src: iconSrc, className: 'w-3 h-3'};
})<StyledIconProps>``;

// Auxiliary Components ========================================================

type SizedButtonProps = {
  size: ButtonProps['size'];
};

/**
 * Extends the button element with the desired size.
 */
const SizedButton = styled.button.attrs(({size}: SizedButtonProps) => {
  const className = `px-4 ${
    size === 'default' ? 'py-3 rounded-2xl' : 'py-2 rounded-xl'
  }`;
  return {className};
})<SizedButtonProps>``;

type StyledButtonProps = {
  mode: ButtonProps['mode'];
  size: ButtonProps['size'];
};

/**
 * Extends the SizedButton element with the desired styling
 */
const StyledButton = styled(SizedButton).attrs(({mode}: StyledButtonProps) => {
  let className;

  if (mode === 'primary') {
    className =
      'text-ui-0 bg-primary-400 hover:bg-primary-500 active:bg-primary-700';
  } else if (mode === 'secondary') {
    className =
      'text-primary-500 bg-primary-100 hover:text-primary-800 active:bg-primary-200 active:text-primary-800';
  } else if (mode === 'tertiary') {
    className =
      'text-ui-600 bg-ui-0 border-2 border-ui-100 hover:border-ui-300 active:border-ui-800';
  } else if (mode === 'ghost') {
    className =
      'text-primary-500 bg-ui-0 hover:text-primary-800 active:bg-primary-50';
  }

  return {className};
})<StyledButtonProps>``;
