import React, {InputHTMLAttributes} from 'react';
import styled from 'styled-components';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Changes a input's color schema */
  mode?: 'default' | 'success' | 'warning' | 'critical';
   /**
   * Whether Input is disabled
   */
  disabled?: boolean;
   /**
   * Whether Input is disabled
   */
  isSelected?: boolean;
};

/** Simple input with variable styling (depending on mode) */
export const Input: React.FC<InputProps> = ({
  mode = 'default',
  disabled,
  isSelected,
  ...props
}) => {
  return (
    <StyledInput data-testid="input" {...props} mode={mode} disabled={disabled} isSelected={isSelected}/>
  );
};

type StyledInputProp = Pick<InputProps, 'mode' | 'disabled' | 'isSelected'>;

export const StyledInput = styled.input.attrs(({mode, disabled, isSelected}: StyledInputProp) => {
    let className = `py-1.5 px-2 ${!disabled && 'bg-ui-0'} 
    focus:outline-none focus:ring-2 focus:ring-primary-500 
    rounded-xl hover:border-ui-300 border-2 active:border-primary-500 `;

    if (isSelected) {
      className += 'border-primary-500'
    } else if (mode === 'default') {
      className += 'border-ui-100';
    } else if (mode === 'success') {
      className += 'border-success-600';
    } else if (mode === 'warning') {
      className += 'border-warning-600';
    } else if (mode === 'critical') {
      className += 'border-critical-600';
    }

    return {className};
})<StyledInputProp>``;