import React, {createContext, useContext, useMemo, useState} from 'react';
import styled from 'styled-components';

type RadioContextType = {
  selectedValue: string;
  onChange: (value: string) => void;
};

export const RadioGroupContext = createContext<RadioContextType | undefined>(
  undefined
);

export const useRadioGroupContext = () =>
  useContext(RadioGroupContext) as RadioContextType;

const RadioProvider: React.FC<RadioGroupProps> = ({
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

  const value = useMemo(
    () => ({
      selectedValue,
      onChange,
    }),
    [selectedValue, onChange]
  );

  return (
    <RadioGroupContext.Provider value={value}>
      {children}
    </RadioGroupContext.Provider>
  );
};

export type RadioGroupProps = {
  defaultValue: string;
  onChange?: (value: string) => void;
};

export const RadioGroup: React.FC<RadioGroupProps> = ({
  defaultValue,
  onChange,
  children,
}) => {
  return (
    <RadioProvider defaultValue={defaultValue} onChange={onChange}>
      <HStack data-testid="radioGroup">{children}</HStack>
    </RadioProvider>
  );
};

const HStack = styled.div.attrs({
  className: 'bg-ui-50 rounded-xl p-0.5 w-max',
})``;
