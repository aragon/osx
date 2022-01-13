import React from 'react';
import styled from 'styled-components';
import {IconCalendar} from '../icons';

// NOTE: Currently, there are no designs for the actual date-picker.
// TODO: Add styling for date-picker once designs are ready. [VR 07-01-2022]

export type DateInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const DateInput: React.FC<DateInputProps> = ({disabled, ...props}) => {
  const isFF = navigator.userAgent.indexOf('Firefox') !== -1;

  return (
    <InputContainer data-testid="date-input" disabled={disabled}>
      <StyledInput type={'date'} required disabled={disabled} {...props} />
      {/* TODO Rework the whole icon business. The native icon is somehow
      necessary on chrome to open the native date picker. So currently it's
      being shown on chrome, although it is not the custom icon from the
      designs. On the other hand, it doesn't exist on FF, so there, the custom
      icon is shown.*/}
      {isFF && (
        <IconContainer disabled={disabled}>
          <IconCalendar />
        </IconContainer>
      )}
    </InputContainer>
  );
};

/* NOTE: I know very similar code already exists in TextInput. But there were a
couple of issues that made it hard to adopt. One of which is that it still
allows for hover and active when disabled. */

type InputContainerProps = Pick<DateInputProps, 'disabled'>;

const InputContainer = styled.div.attrs(({disabled}: InputContainerProps) => {
  const baseClasses =
    'flex items-center py-1.5 px-2 rounded-xl border-2 font-normal';
  let className = `${baseClasses}`;

  if (disabled) {
    className += ' bg-ui-100 text-ui-300 border-ui-200';
  } else {
    const focusClasses =
      'focus:outline-none focus:ring-2 focus:ring-primary-500';
    const hoverClasses = 'hover:border-ui-300';
    const activeClasses = 'active:border-primary-500';
    className += ` bg-ui-0 text-ui-600 ${focusClasses} ${hoverClasses} ${activeClasses}`;
  }
  return {className, disabled};
})<DateInputProps>``;

const StyledInput = styled.input.attrs(() => {
  const baseClasses = 'w-full bg-transparent focus:outline-none';
  const className = `${baseClasses}`;

  return {className};
})<DateInputProps>``;

const IconContainer = styled.div.attrs(({disabled}: InputContainerProps) => {
  return {className: ` p-1 rounded-xl ${disabled ? 'bg-ui-100' : 'bg-ui-50'}`};
})<DateInputProps>``;
