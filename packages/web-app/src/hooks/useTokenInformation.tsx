import {useCallback, useEffect, useState} from 'react';

import useIsMounted from './useIsMounted';
import {fetchTokenData} from 'services/prices';
import {BaseTokenInfo, HookData, TokenBalance} from 'utils/types';

/**
 * Hook that fetches information for given list of tokens.
 * @param tokenBalances Address of a Token
 * @returns List of token information as well as the hook state.
 */
export const useTokenInfo = (tokenBalances: TokenBalance[]) => {
  const isMounted = useIsMounted();
  const [error, setError] = useState<Error>();
  const [tokenInfo, setTokenInfo] = useState<BaseTokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /*************************************************
   *           Callbacks and Functions             *
   *************************************************/
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function fetchBlockchainTokenInfo(_address: string) {
    // TODO: TEMPORARY; getTokenInfo from chain using ethers
    // Keep in mind there is no need to get Ethereum info: can just get from constants
    return Promise.resolve({
      name: 'Patito Dao Token',
      symbol: 'PDT',
      decimals: 18,
    });
  }

  const fetchAllTokenData = useCallback(async () => {
    setIsLoading(true);

    try {
      const allFetchPromise = Promise.all(
        tokenBalances.map(tokenBalance => fetchTokenData(tokenBalance.address))
      );

      // Await all promises
      const fetched = await allFetchPromise;

      const allTokenDataPromise = Promise.all(
        fetched.map((value, index) =>
          fetchBlockchainTokenInfo(tokenBalances[index].address).then(info => {
            const count = tokenBalances[index].count;
            const address = tokenBalances[index].address;
            if (value) return {...value, count, decimals: info.decimals};
            return {...info, count, address, imgUrl: ''};
          })
        )
      );

      // Update the state
      if (isMounted()) {
        setTokenInfo(await allTokenDataPromise);
        setIsLoading(false);
      }
    } catch (error) {
      if (isMounted()) setError(error as Error);
      console.error(error);
    }
  }, [isMounted, tokenBalances]);

  /*************************************************
   *                      Hooks                    *
   *************************************************/
  useEffect(() => {
    fetchAllTokenData();
  }, [fetchAllTokenData]);

  /*************************************************
   *                  Hook Response                *
   *************************************************/
  const res: HookData<BaseTokenInfo[]> = {
    data: tokenInfo,
    error,
    isLoading,
  };
  return res;
};
