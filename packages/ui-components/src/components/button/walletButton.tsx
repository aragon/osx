import React from 'react';
import styled from 'styled-components';

import {SizedButton} from './button';
import {Avatar} from '../avatar';
import {Spinner} from '../spinner';

export type WalletButtonProps = {
  size: 'small' | 'default';
  address: string;
  src: string;
  isMobile: boolean;
  isLoading: boolean;
  onClick: () => void;
  /**
  * Whether the current item is active
  */
  isSelected: boolean;
};

export function getTruncatedAddress(address: string | null) {
  if (address === null) return '';
  return (
    address.substring(0, 5) +
    '...' +
    address.substring(address.length - 4, address.length)
  );
}

// TODO Should the button manage the open/close state from within?
export const WalletButton = ({
  size = 'default',
  address,
  src,
  isSelected = false,
  isMobile,
  isLoading,
  onClick,
}: WalletButtonProps) => {
  if (!isLoading)
    return (
      <StyledButton onClick={onClick} size={size} isSelected={isSelected}>
        {!isMobile && <p>{getTruncatedAddress(address)}</p>}
        <Avatar src={src} size={'small'} />
      </StyledButton>
    );
  else
    return (
      <StyledButton onClick={onClick} size={size} isSelected={false}>
        {!isMobile && <p>1 TX Pending</p>}
        <Spinner size={'small'} />
      </StyledButton>
    );
};

type StyledButtonProp = {isSelected: boolean};
const StyledButton = styled(SizedButton).attrs(({isSelected}: StyledButtonProp) => ({
  className : `flex space-x-1.5 py-1.5 
  ${isSelected ? 'text-primary-500 bg-primary-50' : 'text-ui-600 bg-ui-0'}`
}))<StyledButtonProp>``;
