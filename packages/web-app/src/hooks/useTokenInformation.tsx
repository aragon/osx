import {Address} from '@aragon/ui-components/dist/utils/addresses';
import {constants} from 'ethers';
import {useEffect, useState} from 'react';
import {BaseTokenInfo, HookData} from 'utils/types';

// TODO: Eventually, the idea is to pass HookData<Address[]> into this this hook
// directly (Note that this hook depends on the ouput of useDaoTokens). This
// would then allow to handle the loading and error state of the useDaoTokens
// directly in here.

/**
 * Hook that fetches information for given list of tokens.
 *
 * @param tokenAddresses Address of a Token
 * @returns List of token information as well as the hook state.
 */
export const useTokenInfo = (tokenAddresses: Address[]) => {
  const [tokenInfo, setTokenInfo] = useState<BaseTokenInfo[]>([]);
  const [loading, setLoading] = useState(false); // eslint-disable-line
  const [error, setError] = useState<Error>(); // eslint-disable-line

  useEffect(() => {
    // TODO Fetch data for given token addresses from token API here
    if (tokenAddresses) 42;
    setTokenInfo(TEMP_TOKENS);
  }, []); // eslint-disable-line

  const res: HookData<BaseTokenInfo[]> = {
    data: tokenInfo,
    isLoading: false,
  };
  return res;
};

// Temporary, should be gotten from the respective API
const TEMP_TOKENS: BaseTokenInfo[] = [
  {
    name: 'Ethereum',
    address: constants.AddressZero,
    imgUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
    count: 0.255555,
    symbol: 'ETH',
    decimals: 18,
  },
  {
    name: 'Aragon',
    address: '0xa117000000f279d81a1d3cc75430faa017fa5a2e',
    imgUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1680.png',
    count: 6,
    symbol: 'ANT',
    decimals: 18,
  },
  {
    name: 'Dai',
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    imgUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/4943.png',
    count: 245,
    symbol: 'DAI',
    decimals: 18,
  },
  {
    name: 'Patito DAO TOken',
    address: 'randomAddress',
    imgUrl: '',
    count: 500000,
    symbol: 'PDT',
    decimals: 18,
  },
  {
    name: 'Tether',
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    imgUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png',
    count: 344578,
    symbol: 'USDT',
    decimals: 6,
  },
];
