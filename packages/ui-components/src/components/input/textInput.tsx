import React, {ReactNode} from 'react';
import styled from 'styled-components';

export type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** Changes a input's color schema */
  mode?: 'default' | 'success' | 'warning' | 'critical';
  /**
   * adornment
   */
  adornment?: ReactNode;
  /**
   * Wheter the icon is left or right of the input
   */
  side: 'left' | 'right';
};

/** Simple input with variable styling (depending on mode) */
export const TextInput: React.FC<TextInputProps> = ({
  mode = 'default',
  side = 'right',
  disabled,
  adornment,
  ...props
}) => {
  return (
    <Container data-testid="input" {...{mode, disabled, side}}>
      <StyledInput disabled={disabled} {...props} />
      {adornment}
    </Container>
  );
};

type StyledCotainerProps = Pick<TextInputProps, 'mode' | 'disabled' | 'side'>;

export const Container = styled.div.attrs(
  ({mode, disabled, side}: StyledCotainerProps) => {
    let className = `${!disabled && 'bg-ui-0'} flex space-x-1.5 space-x-1.5
    focus:outline-none focus-within:ring-2 focus-within:ring-primary-500 py-1.5 px-2
    rounded-xl hover:border-ui-300 border-2 active:border-primary-500
    ${side === 'left' && 'flex-row-reverse space-x-reverse'} items-center `;

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
)<StyledCotainerProps>``;

export const StyledInput = styled.input.attrs(() => {
  let myClassName: string | undefined =
    'w-full bg-transparent focus:outline-none';
  return {className: myClassName};
})<React.InputHTMLAttributes<HTMLInputElement>>``;
