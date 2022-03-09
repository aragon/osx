import {InfuraProvider, Web3Provider} from '@ethersproject/providers';
import React, {createContext, useContext, useEffect, useState} from 'react';
import {useWallet} from 'use-wallet';

import {INFURA_PROJECT_ID_ARB} from 'utils/constants';
import {Nullable} from 'utils/types';

const NW_ARB = {chainId: 42161, name: 'arbitrum'};
const NW_ARB_RINKEBY = {chainId: 421611, name: 'arbitrum-rinkeby'};

/* CONTEXT PROVIDER ========================================================= */

type Providers = {
  infura: InfuraProvider;
  web3: Nullable<Web3Provider>;
};

const ProviderContext = createContext<Nullable<Providers>>(null);

type ProviderProviderProps = {
  children: React.ReactNode;
};

/**
 * Returns two blockchain providers.
 *
 * The infura provider is always available, regardless of whether or not a
 * wallet is connected.
 *
 * The web3 provider, however, is based on the conencted and wallet and will
 * therefore be null if no wallet is connected.
 */
export function ProvidersProvider({children}: ProviderProviderProps) {
  const {chainId, ethereum} = useWallet();
  const [web3Provider, setWeb3Provider] = useState(
    ethereum ? new Web3Provider(ethereum) : null
  );

  const [infuraProvider, setInfuraProvider] = useState(
    new InfuraProvider(NW_ARB, INFURA_PROJECT_ID_ARB)
  );

  useEffect(() => {
    // NOTE Passing the chainIds from useWallet doesn't work in the case of
    // arbitrum and arbitrum-rinkeby. They need to be passed as objects.
    // However, I have no idea why this is necessary. Looking at the ethers
    // library, there's no reason why passing the chainId wouldn't work. Also,
    // I've tried it on a fresh project and had no problems there...
    // [VR 07-03-2022]
    if (chainId === 42161) {
      setInfuraProvider(new InfuraProvider(NW_ARB, INFURA_PROJECT_ID_ARB));
    } else if (chainId === 421611) {
      setInfuraProvider(
        new InfuraProvider(NW_ARB_RINKEBY, INFURA_PROJECT_ID_ARB)
      );
    } else {
      setInfuraProvider(new InfuraProvider(chainId, INFURA_PROJECT_ID_ARB));
    }
  }, [chainId]);

  useEffect(() => {
    setWeb3Provider(ethereum ? new Web3Provider(ethereum) : null);
  }, [ethereum, chainId]);

  return (
    <ProviderContext.Provider
      value={{infura: infuraProvider, web3: web3Provider}}
    >
      {children}
    </ProviderContext.Provider>
  );
}

/* CONTEXT CONSUMER ========================================================= */

export function useProviders(): NonNullable<Providers> {
  return useContext(ProviderContext) as Providers;
}
