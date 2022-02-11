/* eslint-disable @typescript-eslint/no-explicit-any */
// Workarounds are used that necessitate the any escape hatch

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {UseWalletProvider, useWallet} from 'use-wallet';
import {Wallet} from 'use-wallet/dist/cjs/types';
import {providers as EthersProviders} from 'ethers';
import {Interface, getAddress, hexZeroPad} from 'ethers/lib/utils';

import {identifyUser} from 'services/analytics';
import {updateAPMContext, useAPM} from './elasticAPM';
import {INFURA_PROJECT_ID} from 'utils/constants';
import {erc20TokenABI} from '../abis/erc20TokenABI';

export type WalletAugmented = Wallet & {
  provider: EthersProviders.Provider;
  getTokenList: () => Promise<string[]>;
};
// Any is a workaround so TS doesn't ask for a filled out default
const WalletAugmentedContext = React.createContext<WalletAugmented | any>({});

function useWalletAugmented(): WalletAugmented {
  return useContext(WalletAugmentedContext);
}

const WalletAugmented: React.FC<unknown> = ({children}) => {
  const wallet = useWallet();
  const ethereum: any = wallet.ethereum;
  const defaultProvider = new EthersProviders.InfuraProvider(
    wallet.chainId, // set provider based on wallet chain id
    INFURA_PROJECT_ID
  );
  const [provider, setProvider] =
    useState<EthersProviders.Provider>(defaultProvider);

  useEffect(() => {
    const infuraProvider = new EthersProviders.InfuraProvider(
      wallet.chainId,
      INFURA_PROJECT_ID
    );
    setProvider(infuraProvider);
  }, [wallet.chainId]);

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

  const getTokenList = useCallback(async () => {
    const erc20Interface = new Interface(erc20TokenABI);
    const latestBlockNumber = await provider.getBlockNumber();

    // Get all transfers sent to the input address
    const transfers = await provider.getLogs({
      fromBlock: 0,
      toBlock: latestBlockNumber,
      topics: [
        erc20Interface.getEventTopic('Transfer'),
        null,
        hexZeroPad(wallet.account as string, 32),
      ],
    });

    // Filter unique token contract addresses and convert all events to Contract instances
    const tokens = await Promise.all(
      transfers
        .filter(
          (event, i) =>
            i === transfers.findIndex(other => event.address === other.address)
        )
        .map(event => getAddress(event.address))
    );
    return tokens;
  }, [provider, wallet.account]);

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

  useEffect(() => {
    if (injectedProvider) setProvider(injectedProvider);
  }, [injectedProvider]);

  const contextValue = useMemo(() => {
    return {
      provider,
      ...wallet,
      ...getEnsData,
      getTokenList,
    };
  }, [getEnsData, getTokenList, provider, wallet]);

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
      // Add the following when the arbitrum situation is fixed: 42161, 421611
      chainId: [1, 4, 137, 80001],
    },
  },
  {
    id: 'frame',
    properties: {
      chainId: [1, 4, 137, 80001],
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
