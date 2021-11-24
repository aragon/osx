import React from 'react';
import styled from 'styled-components';
import {WalletCard, ActionListItem, IconTurnOff} from '@aragon/ui-components';

import BottomSheet from '../../components/bottomSheet';
import {useMenuContext} from 'context/menu';
import {useWallet} from 'context/augmentedWallet';

const WalletMenu: React.FC = () => {
  const {isOpen, open, close} = useMenuContext();
  const {reset, account} = useWallet();

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
          src={'https://place-hold.it/150x150'}
          name="ens-name.eth"
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
