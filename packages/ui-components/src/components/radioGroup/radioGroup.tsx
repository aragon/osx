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

  // eslint-disable-next-line
  const onChange = (nextValue: string) => {
    setSelectedValue(nextValue);
    if (onChangeCallback) {
      onChangeCallback(nextValue);
    }
  };

  // TODO This is basically useless so long as onChange is not in a callback.
  // That being said, I'm not sure memoizng is worth it here in the first place.
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
  className: 'flex bg-ui-50 rounded-xl p-0.5 w-max',
})``;
