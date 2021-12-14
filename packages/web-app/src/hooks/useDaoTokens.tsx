import {Address} from '@aragon/ui-components/dist/utils/addresses';
import {constants} from 'ethers';
import {useEffect, useState} from 'react';
import {HookData} from 'utils/types';

/**
 * Hook that fetches all the Tokens a DAO has available in their vault.
 *
 * NOTE: This hook currently returns static data. This data consists of 4
 * curated token addresses.
 *
 * @param daoName Address of a DAO
 * @returns List of token addresses that the DAO as well as the hook state.
 */
export const useDaoTokens = (daoAddress: Address) => {
  const [tokens, setTokens] = useState<Address[]>([]); // eslint-disable-line
  const [loading, setLoading] = useState(false); // eslint-disable-line
  const [error, setError] = useState<Error>(); // eslint-disable-line

  useEffect(() => {
    // TODO Fetch data from subgraph here
    if (daoAddress) 42;
    setTokens(TEMP_TOKEN_ADDR);
  }, []); // eslint-disable-line

  const res: HookData<Address[]> = {
    data: TEMP_TOKEN_ADDR,
    isLoading: false,
  };
  return res;
};

// TEMPORARY, should eventually be obtained from a subgraph
const TEMP_TOKEN_ADDR: Address[] = [
  constants.AddressZero,
  '0xa117000000f279d81a1d3cc75430faa017fa5a2e',
  '0x6b175474e89094c44da98b954eedeac495271d0f',
  '0xdac17f958d2ee523a2206206994597c13d831ec7',
];
