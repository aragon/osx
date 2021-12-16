import styled from 'styled-components';
import React, {ButtonHTMLAttributes, useMemo} from 'react';

import {Spinner} from '../spinner';
import {IconPerson} from '../icons';
import {AvatarWallet} from '../avatar';
import {shortenAddress} from '../../utils/addresses';

export type ButtonWalletProps = ButtonHTMLAttributes<HTMLButtonElement> & {
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
  /**
   * Check if wallet is connected!
   */
  isConnected?: boolean;
};

export const ButtonWallet = ({
  label,
  src,
  isLoading = false,
  isConnected = false,
  ...props
}: ButtonWalletProps) => {
  const Avatar = useMemo(() => {
    if (isConnected)
      return isLoading ? (
        <Spinner size="small" />
      ) : (
        <AvatarWallet src={src || ''} />
      );
    else return <IconPerson className="h-2.5 w-2.5" />;
  }, [isConnected, isLoading, src]);

  return (
    <StyledButton {...props} {...{isLoading}}>
      <StyledLabel>{shortenAddress(label)}</StyledLabel>
      {Avatar}
    </StyledButton>
  );
};

type StyledButtonProp = Pick<ButtonWalletProps, 'isLoading'>;

const StyledButton = styled.button.attrs(({isLoading}: StyledButtonProp) => {
  const className: string = `${
    isLoading ? 'text-primary-500' : 'text-ui-600'
  } flex items-center tablet:space-x-1.5 font-bold px-2 h-6 hover:text-ui-800
    active:text-ui-800 disabled:text-ui-300 bg-ui-0 hover:bg-ui-100 active:bg-ui-200
    disabled:bg-ui-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500`;
  return {className};
})``;

const StyledLabel = styled.p.attrs({
  className: 'tablet:inline hidden',
})``;
