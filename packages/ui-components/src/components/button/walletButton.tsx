import React from 'react';
import styled from 'styled-components';

import {SizedButton} from './button';
import {Avatar} from '../avatar';
import {Spinner} from '../spinner';

export type WalletButtonProps = {
  /**
  * set wallet Address/Ens
  */
  label: string;
  /**
  * Avatar Image source
  */
  src: string;
  /**
  * Loading mode
  */
  isLoading: boolean;
  onClick: () => void;
  /**
  * Whether the current item is active
  */
  isSelected: boolean;
};

// get truncated address
export function BeautifyLabel(label: string | null) {
  if (label === null) return '';
  if(IsAddress(label))
    return (
      label.substring(0, 5) +
      '...' +
      label.substring(label.length - 4, label.length)
    );
  else return label
}

// check label type
export function IsAddress(address: string | null) {
  const re = /0x[a-fA-F0-9]{40}/g;
  return Boolean(address?.match(re));
}


export const WalletButton = ({
  label,
  src,
  isSelected = false,
  isLoading,
  onClick,
}: WalletButtonProps) => {
  if (!isLoading)
    return (
      <StyledButton onClick={onClick} size={'default'} isSelected={isSelected}>
        <StyledAddress>{BeautifyLabel(label)}</StyledAddress>
        <Avatar src={src} size={'small'} />
      </StyledButton>
    );
  else
    return (
      <StyledButton onClick={onClick} size={'default'} isSelected={false}>
        <LoadingLabel>{BeautifyLabel(label)}</LoadingLabel>
        <Spinner size={'small'} />
      </StyledButton>
    );
};

type StyledButtonProp = {isSelected: boolean};
const StyledButton = styled(SizedButton).attrs(({isSelected}: StyledButtonProp) => ({
  className : `flex md:space-x-1.5 py-1.5 
  ${isSelected ? 'text-primary-500 bg-primary-50' : 'text-ui-600 bg-ui-0'}`
}))<StyledButtonProp>``;

const LoadingLabel = styled.p.attrs({
  className: 'md:inline hidden text-primary-500'
})``;

const StyledAddress = styled.p.attrs({
  className: 'md:inline hidden'
})``;
