import React, {createContext, useContext, useState} from 'react';
import styled from 'styled-components';

import {OptionProps} from './button';

type ButtonContextType = {
  bgWhite: boolean;
  selectedValue: string;
  onChange: ((value: string) => void) | undefined;
};

export const ButtonGroupContext = createContext<ButtonContextType | undefined>(
  undefined
);

export const useButtonGroupContext = () =>
  useContext(ButtonGroupContext) as ButtonContextType;

type ButtonProviderProps = {
  defaultValue: string;
  bgWhite: boolean;
  onChange: ((value: string) => void) | undefined;
};

const ButtonProvider: React.FC<ButtonProviderProps> = ({
  bgWhite,
  defaultValue,
  onChange: onChangeCallback,
  children,
}) => {
  const [selectedValue, setSelectedValue] = useState(defaultValue);

  const onChange = (nextValue: string) => {
    setSelectedValue(nextValue);
    if (onChangeCallback) {
      onChangeCallback(nextValue);
    }
  };

  const value = {
    bgWhite,
    selectedValue,
    onChange,
  };

  return (
    <ButtonGroupContext.Provider value={value}>
      {children}
    </ButtonGroupContext.Provider>
  );
};

export type ButtonGroupProps = {
  bgWhite: boolean;
  defaultValue: string;
  onChange?: (value: string) => void;
  fullWidth?: boolean;
  children: React.FunctionComponentElement<OptionProps>[];
};

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  bgWhite,
  defaultValue,
  onChange,
  fullWidth = false,
  children,
}) => {
  return (
    <ButtonProvider
      bgWhite={bgWhite}
      defaultValue={defaultValue}
      onChange={onChange}
    >
      <HStack data-testid="buttonGroup" fullWidth={fullWidth} bgWhite={bgWhite}>
        {children}
      </HStack>
    </ButtonProvider>
  );
};

type HStackProps = {
  bgWhite: boolean;
  fullWidth: boolean;
};

const HStack = styled.div.attrs(({bgWhite, fullWidth}: HStackProps) => ({
  className: `flex rounded-xl p-0.5 space-x-1.5 
    ${bgWhite ? 'bg-ui-50' : 'bg-ui-0'}
    ${fullWidth ? 'w-full' : 'w-max'}
  `,
}))<HStackProps>``;
