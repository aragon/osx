import React from 'react';
import styled from 'styled-components';

import {Avatar, AvatarProps} from '../avatar';
import {IconButton} from '../button/iconButton';
import {IconCopy} from '../icons';
import {shortenAddress} from '../../utils/addresses';

export type WalletCardProps = {
  /**
   * wallet ENS name or wallet eth address
   */
  name?: string;
  /**
   * Wallet eth address
   */
  address: string | null;
  /**
   * Allows the Wallet Card component grow horizontally
   * */
  wide: boolean;
} & Pick<AvatarProps, 'src'>;

/**
 * WalletCard UI component
 */
export const WalletCard: React.FC<WalletCardProps> = ({
  src,
  name,
  address,
  wide = false,
}) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(address || '');
  };

  return (
    <Card {...{wide}} data-testid="walletCard">
      <Content>
        <Avatar size={'default'} src={src} />
        <TextContainer>
          <Title>{shortenAddress(name || address)}</Title>
          {address && <Subtitle>{shortenAddress(address)}</Subtitle>}
        </TextContainer>
      </Content>
      <IconButton
        icon={<IconCopy />}
        mode={'ghost'}
        label="copy"
        side="right"
        onClick={copyToClipboard}
      />
    </Card>
  );
};

type ContainerProps = Pick<WalletCardProps, 'wide'>;
const Card = styled.div.attrs(({wide}: ContainerProps) => ({
  className: `flex items-center ${
    wide && 'w-full justify-between'
  } space-x-1.5`,
}))``;

const Content = styled.div.attrs({
  className: 'flex items-center space-x-1.5',
})``;

const TextContainer = styled.div.attrs({
  className: 'text-left',
})``;

const Title = styled.p.attrs({
  className: 'text-ui-700 font-bold',
})``;

const Subtitle = styled.p.attrs({
  className: 'text-sm text-ui-500 font-medium',
})``;
