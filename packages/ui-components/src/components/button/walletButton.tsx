import React from 'react';
import styled from 'styled-components';

import {SizedButton} from './button';
import {Avatar} from '../avatar';
import {Spinner} from '../spinner';
import {shortenAddress} from '../../utils/addresses';

export type WalletButtonProps = {
  /**
   * set wallet Address/Ens
   */
  label: string | null;
  /**
   * Avatar Image source
   */
  src: string;
  /**
   * Loading mode
   */
  isLoading?: boolean;
  onClick: () => void;
  /**
   * Whether the current item is active (isSelected)
   */
  isSelected?: boolean;
};

export const WalletButton = ({
  label,
  src,
  isSelected = false,
  isLoading,
  ...props
}: WalletButtonProps) => {
  return (
    <StyledButton size={'small'} isSelected={isSelected} {...props}>
      <StyledLabel {...{isLoading}}>{shortenAddress(label)}</StyledLabel>
      {!isLoading ? (
        <Avatar src={src} size={'small'} />
      ) : (
        <Spinner size={'small'} />
      )}
    </StyledButton>
  );
};

type StyledButtonProp = Pick<WalletButtonProps, 'isSelected'>;
type StyledLabelProp = Pick<WalletButtonProps, 'isLoading'>;

const StyledButton = styled(SizedButton).attrs(
  ({isSelected}: StyledButtonProp) => ({
    className: `flex tablet:space-x-1.5
      ${isSelected ? ' text-primary-500 bg-primary-50' : ' text-ui-600 bg-ui-0'}
      focus:outline-none focus:ring-2 focus:ring-primary-500 hover:text-primary-500 active:bg-primary-50 disabled:text-ui-300 disabled:bg-ui-0`,
  })
)<StyledButtonProp>``;

const StyledLabel = styled.p.attrs(({isLoading}: StyledLabelProp) => ({
  className: `tablet:inline hidden ${isLoading && 'text-primary-500'}`,
}))``;
