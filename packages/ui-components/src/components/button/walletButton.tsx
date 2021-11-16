import React from 'react';
import styled from 'styled-components';

import {IconClose, IconMenu} from '../icons';
import {SizedButton} from './button';
import {FlexDiv} from './iconButton';

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
  return (
    <StyledButton onClick={onClick} size={'default'}>
      {!isMobile && <p>{getTruncatedAddress(address)}</p>}
      <Avatar src={src} />
    </StyledButton>
  );

  // if (isMobile) {
  //   return (
  //     <StyledButton onClick={onClick} size={'default'}>
  //       <IconMenu />
  //     </StyledButton>
  //   );
  // }

  // if (isLoading) {
  //   return (
  //     <OpenButton onClick={onClick} size={size}>
  //       <FlexDiv side={'left'}>
  //         <IconClose className="fill-current text-primary-500" />
  //         <p>Menu</p>
  //       </FlexDiv>
  //     </OpenButton>
  //   );
  // } else {
  //   return (
  //     <StyledButton onClick={onClick} size={size}>
  //       <FlexDiv side={'left'}>
  //         <IconMenu />
  //         <p>Menu</p>
  //       </FlexDiv>
  //     </StyledButton>
  //   );
  // }
};

type AvatarProps = {
  src: string;
};

const Avatar = styled.img.attrs(({src}: AvatarProps) => {
  const className: string = 'bg-ui-100 h-3 w-3 rounded-full ml-1.5';
  return {className, src};
})<AvatarProps>``;

const StyledButton = styled(SizedButton).attrs({
  className: 'flex bg-ui-0 text-ui-600',
})``;
const OpenButton = styled(SizedButton).attrs({
  className: 'bg-ui-0 text-primary-500',
})``;
