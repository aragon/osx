import React from 'react';
import styled from 'styled-components';
import {Button} from '@aragon/ui-components';

import {useWallet} from 'context/augmentedWallet';

const Wallet: React.FC = () => {
  const {account, balance, reset, connect, isConnected} = useWallet();
  return isConnected() ? (
    <div>
      <div className="text-lg">Account: {account}</div>
      <div>Balance: {balance}</div>
      <Button primary label="disconnect" onClick={() => reset()} />
    </div>
  ) : (
    <Container>
      Connect:
      <Button primary label="MetaMask" onClick={() => connect('injected')} />
      <Button primary label="Frame" onClick={() => connect('frame')} />
      <Button primary label="Portis" onClick={() => connect('portis')} />
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  gap: 20px;
`;

export default Wallet;
