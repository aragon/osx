import React from 'react';
import styled from 'styled-components';
import {Icons} from './checkboxListItem';

export type CheckboxSimpleProps = {
  label: string;
  iconLeft?: boolean;
  multiSelect: boolean;
  disabled?: boolean;
  state?: 'default' | 'active' | 'multi';
  onClick?: React.MouseEventHandler;
};

export const CheckboxSimple: React.FC<CheckboxSimpleProps> = ({
  label,
  iconLeft = true,
  multiSelect,
  disabled = false,
  state = 'default',
  onClick,
}) => {
  return (
    <Container
      data-testid="checkboxSimple"
      disabled={disabled}
      state={state}
      iconLeft={iconLeft}
      onClick={onClick}
    >
      {Icons[multiSelect ? 'multiSelect' : 'radio'][state]}
      <p className="font-bold">{label}</p>
    </Container>
  );
};

type ContainerTypes = {
  disabled: boolean;
  state: 'default' | 'active' | 'multi';
  iconLeft: boolean;
};

const Container = styled.div.attrs(
  ({disabled, state, iconLeft}: ContainerTypes) => ({
    className: `flex w-max space-x-1.5 items-center ${
      !iconLeft && 'flex-row-reverse space-x-reverse'
    } ${
      disabled
        ? 'text-ui-300'
        : `cursor-pointer hover:text-primary-500 ${
            state !== 'default' ? 'text-primary-500' : 'text-ui-600'
          }`
    }`,
  })
)<ContainerTypes>``;
