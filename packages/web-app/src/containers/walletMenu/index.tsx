import React from 'react';
import styled from 'styled-components';
import {ActionListItem, CardWallet, IconTurnOff} from '@aragon/ui-components';

import BottomSheet from '../../components/bottomSheet';
import {useWalletMenuContext} from 'context/walletMenu';
import {useWallet, WalletAugmented} from 'context/augmentedWallet';

export type useWalletProps = {
  ensName?: string | null;
  ensAvatarUrl?: string | null;
} & WalletAugmented;

const WalletMenu: React.FC = () => {
  const {isOpen, open, close} = useWalletMenuContext();
  const {reset, account, ensName, ensAvatarUrl}: useWalletProps = useWallet();

  return (
    <BottomSheet
      isOpen={isOpen}
      onOpen={open}
      onClose={close}
      data-testid="walletCard"
    >
      <Container>
        <CardWallet
          wide
          src={ensAvatarUrl || account}
          name={ensName}
          address={account}
        />
        <ActionContainer>
          <ActionListItem
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
