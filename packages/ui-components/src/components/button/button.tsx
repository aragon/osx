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
export const StyledButton = styled(SizedButton).attrs(
  ({mode}: StyledButtonProps) => {
    let className;

    //TODO add disabled styling once design is finalized
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
  }
)<StyledButtonProps>``;
