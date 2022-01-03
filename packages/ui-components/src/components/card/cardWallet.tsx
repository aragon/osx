import React from 'react';
import styled from 'styled-components';

import {Avatar} from '../avatar';
import {IconCopy} from '../icons';
import {ButtonText} from '../button';
import {shortenAddress} from '../../utils/addresses';

export type CardWalletProps = {
  /**
   * wallet ENS name or wallet eth address
   */
  name?: string | null;
  /**
   * Wallet eth address
   */
  address: string | null;
  /**
   * Allows the Wallet Card component grow horizontally
   */
  wide: boolean;
  /**
   * Avatar Image source
   */
  src: string | null;
};

/**
 * WalletCard UI component
 */
export const CardWallet: React.FC<CardWalletProps> = ({
  src,
  name,
  address,
  wide = false,
}) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(address || '');
  };

  return (
    <Card {...{wide}} data-testid="cardWallet">
      <Content>
        <Avatar size={'default'} src={src || ''} />
        <TextContainer>
          <Title>{shortenAddress(name || address)}</Title>
          {name && <Subtitle>{shortenAddress(address)}</Subtitle>}
        </TextContainer>
      </Content>
      <ButtonText
        label="copy"
        iconRight={<IconCopy />}
        mode="ghost"
        bgWhite
        size="small"
        onClick={copyToClipboard}
      />
    </Card>
  );
};

type ContainerProps = Pick<CardWalletProps, 'wide'>;
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
