import React, {useRef} from 'react';
import styled from 'styled-components';
import {ButtonIcon} from '../button';
import {IconAdd, IconRemove} from '../icons';

export type NumberInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** Changes a input's color schema */
  mode?: 'default' | 'success' | 'warning' | 'critical';
  disabled?: boolean;
  width?: number;
};

export const NumberInput: React.FC<NumberInputProps> = ({
  mode = 'default',
  disabled,
  width,
  ...props
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Container data-testid="number-input" {...{mode, disabled, width}}>
      <ButtonIcon
        mode="ghost"
        size="medium"
        icon={<IconRemove />}
        disabled={disabled}
        onClick={() => inputRef.current?.stepDown()}
      />
      <StyledNumberInput
        {...props}
        ref={inputRef}
        disabled={disabled}
        type={'number'}
        placeholder={'0'}
      />
      <ButtonIcon
        mode="ghost"
        size="medium"
        icon={<IconAdd />}
        disabled={disabled}
        onClick={() => inputRef.current?.stepUp()}
      />
    </Container>
  );
};

export type StyledContainerProps = Pick<
  NumberInputProps,
  'mode' | 'disabled' | 'width'
>;

const Container = styled.div.attrs(
  ({mode, disabled, width}: StyledContainerProps) => {
    let className = `${
      disabled ? 'bg-ui-100' : 'bg-ui-0'
    } inline-flex p-1 bg-ui-0 ${
      width ? '' : 'w-18'
    } focus:outline-none items-center
      focus-within:ring-2 focus-within:ring-primary-500 justify-between
      rounded-xl hover:border-ui-300 border-2 active:border-primary-500 
    `;

    if (mode === 'default') {
      className += 'border-ui-100';
    } else if (mode === 'success') {
      className += 'border-success-600';
    } else if (mode === 'warning') {
      className += 'border-warning-600';
    } else if (mode === 'critical') {
      className += 'border-critical-600';
    }

    return {
      className,
      ...(width && {style: {width: `${width}px`}}),
    };
  }
)<StyledContainerProps>``;

const StyledNumberInput = styled.input.attrs(({disabled}) => {
  const className: string | undefined = `${
    disabled ? 'text-ui-300' : 'text-ui-600'
  } bg-transparent focus:outline-none margin-0 w-full`;

  return {
    className,
  };
})`
  text-align: center;
  ::-webkit-inner-spin-button,
  ::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  -moz-appearance: textfield;
`;
