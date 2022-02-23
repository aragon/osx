import React from 'react';
import styled from 'styled-components';

import {Address, shortenAddress} from '../../utils/addresses';
import {AvatarDao, AvatarDaoProps} from '../avatar';
import {ButtonIcon} from '../button/buttonIcon';
import {IconSwitch} from '../icons';

export type CardDaoProps = {
  daoName: string;
  /** Dao's ethereum address **or** ENS name */
  daoAddress: Address;

  /** Handler for the switch button. Will be called when the button is clicked.
   * */
  onClick: () => void;
} & Pick<AvatarDaoProps, 'src'>;

/**
 * ## Description
 *
 * This card is used to display the current DAO (including name and (ens-)
 * address). Additionally, the switch button allows a user to access the DAO
 * explorer, where they can change DAO.
 */
export const CardDao: React.FC<CardDaoProps> = ({
  daoName,
  daoAddress,
  onClick,
  src,
}: CardDaoProps) => {
  return (
    <Card data-testid="cardDao" onClick={onClick}>
      <LeftContent>
        <AvatarDao daoName={daoName} src={src} />
        <TextContainer>
          <DaoName>{daoName}</DaoName>
          <DaoAddress>{shortenAddress(daoAddress)}</DaoAddress>
        </TextContainer>
      </LeftContent>

      <ButtonIcon
        className="desktop:hidden"
        icon={<IconSwitch />}
        mode="secondary"
        size="small"
        bgWhite
      />
      <ButtonIcon
        className="hidden desktop:flex"
        icon={<IconSwitch />}
        mode="secondary"
        size="small"
      />
    </Card>
  );
};

const Card = styled.div.attrs(() => ({
  className:
    'flex desktop:inline-flex items-center space-x-3 bg-ui-0' +
    ' desktop:bg-transparent p-3 desktop:p-0 rounded-xl cursor-pointer',
}))``;

const LeftContent = styled.div.attrs({
  className: 'inline-flex flex-1 space-x-1.5',
})``;

const TextContainer = styled.div.attrs({
  className: 'flex flex-col justify-center',
})``;

const DaoName = styled.p.attrs({
  className: 'text-ui-800 font-bold',
})``;

const DaoAddress = styled.p.attrs({
  className: 'text-ui-500 text-sm desktop:hidden',
})``;
