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
  isMobile,
  isLoading,
  onClick,
}: WalletButtonProps) => {
  if (!isLoading)
    return (
      <StyledButton onClick={onClick} size={size}>
        {!isMobile && <p>{getTruncatedAddress(address)}</p>}
        <Avatar src={src} size={'small'} />
      </StyledButton>
    );
  else
    return (
      <StyledButton onClick={onClick} size={size}>
        {!isMobile && <p>1 TX Pending</p>}
        <Spinner size={'small'} />
      </StyledButton>
    );
};

const StyledButton = styled(SizedButton).attrs({
  className: 'bg-ui-0 text-ui-600 flex space-x-1.5 py-1.5',
})``;
