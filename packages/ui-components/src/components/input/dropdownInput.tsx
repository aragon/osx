import React from 'react';
import styled from 'styled-components';
import {IconChevronDown} from '../icons';
import {StyledContainerProps} from './numberInput';

export type DropDownInputProps = {
  /** Changes a input's color schema */
  mode?: 'default' | 'success' | 'warning' | 'critical';
  disabled?: boolean;
  value?: string;
  name?: string;
  placeholder?: string;
  onClick: () => void;
};
/** Dropdown input with variable styling (depending on mode) */

export const DropdownInput: React.FC<DropDownInputProps> = ({
  mode = 'default',
  disabled,
  value,
  name,
  placeholder,
  onClick,
}) => {
  return (
    <Container
      data-testid="dropdown-input"
      {...{mode, name, disabled, onClick}}
    >
      {value || <Placeholder>{placeholder}</Placeholder>}
      <StyledIconChevronDown {...{disabled}} />
    </Container>
  );
};

const Container = styled.button.attrs(
  ({mode, disabled}: StyledContainerProps) => {
    let className = `${
      disabled ? 'bg-ui-100' : 'bg-ui-0'
    } flex bg-ui-0 focus:outline-none focus-within:ring-2 
    focus-within:ring-primary-500 py-1.5 px-2 rounded-xl w-full 
    hover:border-ui-300 border-2 active:border-primary-500 items-center 
    justify-between `;

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
)`
  height: fit-content;
`;

export type StyledChevronDownProps = Pick<StyledContainerProps, 'disabled'>;

const StyledIconChevronDown = styled(IconChevronDown).attrs(
  ({disabled}: StyledChevronDownProps) => ({
    className: `${disabled ? 'text-ui-300' : 'text-ui-600'}`,
  })
)``;

const Placeholder = styled.span.attrs({
  className: 'text-ui-300',
})``;
