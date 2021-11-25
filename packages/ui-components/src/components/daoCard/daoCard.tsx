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
  /** Determines if switch button is displayed and sets the card to clickable */
  includeSwitch?: boolean;
  /**
   * Allows the Dao Card component grow horizontally, thereby moving the switcher
   * button right.
   * */
  wide?: boolean;
  /** Label for switch button */
  switchLabel?: string;
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
  includeSwitch = true,
  onClick,
  wide = false,
  src,
  switchLabel,
}: DaoCardProps) => {
  return (
    <Card
      data-testid="daoCard"
      includeSwitch={includeSwitch}
      wide={wide}
      {...(!includeSwitch && {onClick})}
    >
      <LeftContent>
        <Avatar src={src} mode={'square'} size={'large'} />
        <TextContainer>
          <DaoName>{daoName}</DaoName>
          <DaoAddress>{shortenAddress(daoAddress)}</DaoAddress>
        </TextContainer>
      </LeftContent>
      {includeSwitch && (
        <StyledButton mode={'ghost'} size={'small'} onClick={onClick}>
          <FlexDiv side={'right'}>
            <IconSwitch />
            <p>{switchLabel}</p>
          </FlexDiv>
        </StyledButton>
      )}
    </Card>
  );
};

type CardProps = {
  includeSwitch?: boolean;
  wide?: boolean;
};

const Card = styled.div.attrs(({includeSwitch, wide}: CardProps) => ({
  className: `${!includeSwitch && 'cursor-pointer'} ${
    wide ? 'flex justify-between' : 'inline-flex'
  }`,
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

// FIXME: temporarily changed font weight
const DaoAddress = styled.p.attrs({
  className: 'text-ui-400 font-medium text-sm',
})``;
