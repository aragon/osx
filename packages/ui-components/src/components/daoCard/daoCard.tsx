import React from 'react';
import styled from 'styled-components';

import {Address, shortenAddress} from '../../utils/addresses';
import {Avatar, AvatarProps} from '../avatar';
import {StyledButton} from '../button/button';
import {FlexDiv} from '../button/iconButton';
import {IconSwitch} from '../icons';

export type DaoCardProps = {
  daoName: string;
  /** Dao's ethereum address **or** ENS name */
  daoAddress: Address;
  /**
   * Allows the Dao Card component grow vertically, thereby moving the switcher
   * button right.
   * */
  wide: boolean;
  /** Handler for the switch button. Will be called when the button is clicked.
   * */
  onClick: () => void;
} & Pick<AvatarProps, 'src'>;

/**
 * ## Description
 *
 * This card is used to display the current DAO (including name and (ens-)
 * address). Additionally, the switch button allows a user to access the DAO
 * explorer, where they can change DAO.
 *
 * > Note: This component is currently only designed for mobile. It may still be
 * > used for larger devices, though.
 */
export const DaoCard: React.FC<DaoCardProps> = ({
  daoName,
  daoAddress,
  onClick,
  wide = false,
  src,
}: DaoCardProps) => {
  return (
    <Card data-testid="daoCard" wide={wide}>
      <LeftContent>
        <Avatar src={src} mode={'square'} size={'large'} />
        <TextContainer>
          <DaoName>{daoName}</DaoName>
          <DaoAddress>{shortenAddress(daoAddress)}</DaoAddress>
        </TextContainer>
      </LeftContent>
      <StyledButton mode={'ghost'} size={'small'} onClick={onClick}>
        <FlexDiv side={'right'}>
          <IconSwitch />
          <p>{'Switch'}</p>
        </FlexDiv>
      </StyledButton>
    </Card>
  );
};

type CardProps = {
  wide?: boolean;
};

const Card = styled.div.attrs(({wide}: CardProps) => ({
  className: wide ? 'flex justify-between' : 'inline-flex',
}))<CardProps>``;

const LeftContent = styled.div.attrs({
  className: 'inline-flex',
})``;

const TextContainer = styled.div.attrs({
  className: 'pl-1.5 pr-2',
})``;

const DaoName = styled.p.attrs({
  className: 'text-ui-800 font-bold text-base',
})``;
const DaoAddress = styled.p.attrs({
  className: 'text-ui-400 font-normal text-sm',
})``;
