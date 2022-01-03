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
  side?: 'left' | 'right';
  /**
   * make input disabled and the whole form clickable
   */
  clickable?: boolean;
};

/** Simple input with variable styling (depending on mode) */
export const TextInput: React.FC<TextInputProps> = ({
  mode = 'default',
  side = 'right',
  disabled,
  adornment,
  clickable,
  ...props
}) => {
  return (
    <Container data-testid="input" {...{mode, disabled, side, clickable}}>
      <StyledInput disabled={clickable || disabled} clickable={clickable} {...props} />
      {adornment}
    </Container>
  );
};

type StyledCotainerProps = Pick<TextInputProps, 'mode' | 'disabled' | 'side' | 'clickable'>;
type StyledInputProps = Pick<TextInputProps, 'clickable' | 'disabled'>;

export const Container = styled.div.attrs(
  ({mode, disabled, side, clickable}: StyledCotainerProps) => {
    let className = `${disabled ? 'bg-ui-100' : 'bg-ui-0'} flex space-x-1.5 space-x-1.5
    focus:outline-none focus-within:ring-2 focus-within:ring-primary-500 py-1.5 px-2
    rounded-xl hover:border-ui-300 border-2 active:border-primary-500 items-center 
    ${side === 'left' && 'flex-row-reverse space-x-reverse'} ${
      (clickable && !disabled) 
      && 
      'cursor-pointer'
    }  `;

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

export const StyledInput = styled.input.attrs(({clickable, disabled}: StyledInputProps) => {
  let myClassName: string | undefined =
    `w-full bg-transparent focus:outline-none ${(clickable && !disabled) && 'cursor-pointer'}`;
  return {className: myClassName};
})<React.InputHTMLAttributes<HTMLInputElement> & StyledInputProps>``;
