import React from 'react';
import styled from 'styled-components';

import {Avatar} from '../avatar';
import {Spinner} from '../spinner';
import {shortenAddress} from '../../utils/addresses';
import {IconPerson} from '../icons';
import type {ButtonBaseProps} from './buttonBase';

// TODO: refactor to remove sized button to baseButton

type SizedButtonProps = {
  size: ButtonBaseProps['size'];
};

/**
 * Extends the html button element with the desired size.
 * Furthermore, the button comes with rounded corners and a focus ring, as this
 * is shared by all buttons in this library.
 */
export const SizedButton = styled.button.attrs(({size}: SizedButtonProps) => {
  let baseClasses =
    'px-2 focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold';
  let sizedClasses =
    size === 'medium' ? 'py-1.5 rounded-2xl' : 'py-1 rounded-xl text-sm';
  return {className: `${baseClasses} ${sizedClasses}`};
})<SizedButtonProps>``;

export type WalletButtonProps = {
  /**
   * set wallet Address/Ens
   */
  label: string | null;
  /**
   * Avatar Image source
   */
  src: string | null;
  /**
   * Loading mode
   */
  isLoading?: boolean;
  onClick: () => void;
  /**
   * Whether the current item is active (isSelected)
   */
  isSelected?: boolean;
  /**
   * Check if wallet is connected!
   */
  isConnected?: boolean;
};

export const WalletButton = ({
  label,
  src,
  isSelected = false,
  isLoading,
  isConnected = false,
  ...props
}: WalletButtonProps) => {
  const LoadAvatar = () => {
    if (isConnected)
      return !isLoading ? (
        <Avatar src={src || ''} size={'small'} />
      ) : (
        <Spinner size={'small'} />
      );
    else
      return (
        <IconWrapper>
          <IconPerson />
        </IconWrapper>
      );
  };

  return (
    <>
      <StyledButton size={'small'} isSelected={isSelected} {...props}>
        <StyledLabel {...{isLoading}}>{shortenAddress(label)}</StyledLabel>
        {LoadAvatar()}
      </StyledButton>
    </>
  );
};

type StyledButtonProp = Pick<WalletButtonProps, 'isSelected'>;
type StyledLabelProp = Pick<WalletButtonProps, 'isLoading'>;

const StyledButton = styled(SizedButton).attrs(
  ({isSelected}: StyledButtonProp) => ({
    className: `flex items-center tablet:space-x-1.5
      ${isSelected ? ' text-primary-500 bg-primary-50' : ' text-ui-600 bg-ui-0'}
      focus:outline-none focus:ring-2 focus:ring-primary-500 hover:text-primary-500 active:bg-primary-50 disabled:text-ui-300 disabled:bg-ui-0`,
  })
)<StyledButtonProp>``;

const StyledLabel = styled.p.attrs(({isLoading}: StyledLabelProp) => ({
  className: `tablet:inline hidden font-semibold ${
    isLoading && 'text-primary-500'
  }`,
}))``;

const IconWrapper = styled.div.attrs({
  className: `flex justify-center items-center h-3`,
})``;
