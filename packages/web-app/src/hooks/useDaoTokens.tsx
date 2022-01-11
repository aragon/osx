import {Address} from '@aragon/ui-components/dist/utils/addresses';
import {constants} from 'ethers';
import {useEffect, useState} from 'react';

import useIsMounted from 'hooks/useIsMounted';
import {HookData, TokenBalance} from 'utils/types';

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
  const isMounted = useIsMounted();
  const [error, setError] = useState<Error>(); // eslint-disable-line
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    // TODO Fetch data from subgraph here
    if (daoAddress) 42;
    if (isMounted()) {
      setTokens(TEMP_TOKEN_ADDR);
      setLoading(false);
    }
  }, [daoAddress, isMounted]);

  const res: HookData<TokenBalance[]> = {
    data: tokens,
    isLoading: loading,
  };
  return res;
};

// TEMPORARY, should eventually be obtained from a subgraph
// count should NOT be formatted with decimals yet
const TEMP_TOKEN_ADDR: TokenBalance[] = [
  {
    address: '0x35d36f7d2a376143fb8eab3c41bf389eba82e17c',
    count: BigInt('6650000000000000000000'),
  },
  {address: constants.AddressZero, count: BigInt('6224533680000000001')},
  {
    address: '0xa117000000f279d81a1d3cc75430faa017fa5a2e',
    count: BigInt('4350000000000000000000'),
  },
  {
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    count: BigInt('21400000000000000000000'),
  },
  {
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    count: BigInt('5970270000'),
  },
  {
    address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    count: BigInt('1337742870270000000000'),
  },
  {
    address: '0x0f5d2fb29fb7d3cfee444a200298f468908cc942',
    count: BigInt('5210342870270000000000'),
  },
];
