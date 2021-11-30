import React from 'react';
import styled from 'styled-components';
import {WalletCard, ActionListItem, IconTurnOff} from '@aragon/ui-components';

import BottomSheet from '../../components/bottomSheet';
import {useMenuContext} from 'context/menu';
import {useWallet} from 'context/augmentedWallet';
import {Wallet} from 'use-wallet/dist/cjs/types';

export type useWalletProps = {
  ensName?: string | null;
  ensAvatarUrl?: string | null;
} & Wallet;

const WalletMenu: React.FC = () => {
  const {isOpen, open, close} = useMenuContext();
  const {reset, account, ensName, ensAvatarUrl}: useWalletProps = useWallet();

  return (
    <BottomSheet
      isOpen={isOpen}
      onOpen={open}
      onClose={close}
      data-testid="walletCard"
    >
      <Container>
        <WalletCard
          wide
          src={ensAvatarUrl || account}
          name={ensName}
          address={account}
        />
        <ActionContainer>
          <ActionListItem
            wide
            title="Disconnect Wallet"
            icon={<IconTurnOff />}
            onClick={() => {
              reset();
              close();
            }}
          />
        </ActionContainer>
      </Container>
    </BottomSheet>
  );
};

export default WalletMenu;

const Container = styled.div.attrs({
  className: 'space-y-3',
})``;

const ActionContainer = styled.div.attrs({
  className: 'space-y-1.5',
})``;

// const StyledContainer = styled.div.attrs({
//   className: 'desktop:hidden',
// })``;
