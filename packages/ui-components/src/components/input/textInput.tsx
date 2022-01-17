import React, {ReactNode} from 'react';
import styled from 'styled-components';

export type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** Changes a input's color schema */
  mode?: 'default' | 'success' | 'warning' | 'critical';
  /**
   * left adornment
   */
  leftAdornment?: ReactNode;
  /**
   * right adornment
   */
  rightAdornment?: ReactNode;
  disabled?: boolean;
};

/** Simple input with variable styling (depending on mode) */
export const TextInput: React.FC<TextInputProps> = ({
  mode = 'default',
  disabled,
  leftAdornment,
  rightAdornment,
  ...props
}) => {
  return (
    <Container data-testid="input" {...{mode, disabled}}>
      {leftAdornment}
      <StyledInput disabled={disabled} {...props} />
      {rightAdornment}
    </Container>
  );
};

type StyledContainerProps = Pick<TextInputProps, 'mode' | 'disabled'>;

export const Container = styled.div.attrs(
  ({mode, disabled}: StyledContainerProps) => {
    let className = `${
      disabled ? 'bg-ui-100' : 'bg-ui-0'
    } flex items-center space-x-1.5 space-x-1.5 py-1.5 px-2
    focus:outline-none focus-within:ring-2 focus-within:ring-primary-500
    rounded-xl hover:border-ui-300 border-2
    active:border-primary-500 `;

    if (mode === 'default') {
      className += 'border-ui-100';
    } else if (mode === 'success') {
      className += 'border-success-600';
    } else if (mode === 'warning') {
      className += 'border-warning-600';
    } else if (mode === 'critical') {
      className += 'border-critical-600';
    }

    return {className};
  }
)<StyledContainerProps>``;

export const StyledInput = styled.input.attrs(() => {
  const className: string | undefined =
    'w-full bg-transparent focus:outline-none';
  return {className};
})``;
