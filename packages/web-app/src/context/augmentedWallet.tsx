/* eslint-disable @typescript-eslint/no-explicit-any */
// Workarounds are used that necessitate the any escape hatch

import React, {useContext, useEffect, useMemo} from 'react';
import {identifyUser} from 'services/analytics';
import {UseWalletProvider, useWallet} from 'use-wallet';
import {Wallet} from 'use-wallet/dist/cjs/types';
import {providers as EthersProviders} from 'ethers';
import {updateAPMContext, useAPM} from './elasticAPM';

// Any is a workaround so TS doesn't ask for a filled out default
const WalletAugmentedContext = React.createContext<Wallet | any>({});

const useWalletAugmented = (): Wallet => {
  return useContext(WalletAugmentedContext);
};

const WalletAugmented: React.FC<unknown> = ({children}) => {
  const wallet = useWallet();
  const ethereum: any = wallet.ethereum;

  const injectedProvider: any = useMemo(
    () => (ethereum ? new EthersProviders.Web3Provider(ethereum) : null),
    [ethereum]
  );

  const getEnsData: any = useMemo(async () => {
    const ensName = await injectedProvider?.lookupAddress(wallet.account);
    const ensAvatarUrl = await injectedProvider?.getAvatar(wallet.account);
    const address = await injectedProvider?.resolveName(ensName || '');
    return address ? {ensName, ensAvatarUrl} : null;
  }, [injectedProvider, wallet.account]);

  useEffect(() => {
    if (
      wallet.status === 'connected' &&
      typeof wallet.account === 'string' &&
      wallet.connector &&
      wallet.networkName
    ) {
      identifyUser(wallet.account, wallet.networkName, wallet.connector);
    }
  }, [wallet.networkName, wallet.connector, wallet.status, wallet.account]);

  const contextValue = useMemo(() => {
    return {
      ...wallet,
      ...getEnsData,
    };
  }, [getEnsData, wallet]);

  const {apm} = useAPM();
  useEffect(() => {
    updateAPMContext(apm, wallet.networkName!);
  }, [apm, wallet.networkName]);

  return (
    <WalletAugmentedContext.Provider value={contextValue}>
      {children}
    </WalletAugmentedContext.Provider>
  );
};

export const connectors = [
  {
    id: 'injected',
    properties: {
      chainId: [1, 4],
    },
  },
  {
    id: 'frame',
    properties: {
      chainId: 1,
    },
  },
];

const useWalletConnectors = connectors.reduce(
  (current: any, connector: any) => {
    current[connector.id] = connector.properties || {};
    return current;
  },
  {}
);

const WalletProvider: React.FC<unknown> = ({children}) => {
  return (
    <UseWalletProvider connectors={useWalletConnectors}>
      <WalletAugmented>{children}</WalletAugmented>
    </UseWalletProvider>
  );
};

export {useWalletAugmented as useWallet, WalletProvider};
