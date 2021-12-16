// TODO: refactor to use buttonText
import React, {ButtonHTMLAttributes} from 'react';
import styled from 'styled-components';
import {useRadioGroupContext} from './radioGroup';

type RadioProps = {
  value: string;
};

export const Radio: React.FC<RadioProps> = ({value, children}) => {
  const {selectedValue, onChange} = useRadioGroupContext();

  return (
    <StyledRadioButton
      isSelected={selectedValue === value}
      value={value}
      onClick={() => onChange(value)}
    >
      {children}
    </StyledRadioButton>
  );
};

interface StyledRadioButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  isSelected: boolean;
}

const StyledRadioButton = styled.button.attrs(
  ({isSelected}: StyledRadioButtonProps) => ({
    className: `p-1 font-bold ${
      isSelected ? 'bg-ui-0 text-primary-500' : 'text-ui-500'
    }`,
    style: {borderRadius: '0.625rem', minWidth: '4rem'},
  })
)<StyledRadioButtonProps>``;
