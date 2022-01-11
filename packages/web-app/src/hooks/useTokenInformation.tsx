import {useCallback, useEffect, useState} from 'react';

import {useWallet} from 'context/augmentedWallet';
import useIsMounted from './useIsMounted';
import {getTokenInfo} from 'utils/tokens';
import {fetchTokenData} from 'services/prices';
import {BaseTokenInfo, HookData, TokenBalance} from 'utils/types';

/**
 * Hook that fetches information for given list of tokens.
 * @param tokenBalances Address of a Token
 * @returns List of token information as well as the hook state.
 */
export const useTokenInfo = (tokenBalances: TokenBalance[]) => {
  const isMounted = useIsMounted();
  const {provider} = useWallet();
  const [error, setError] = useState<Error>();
  const [tokenInfo, setTokenInfo] = useState<BaseTokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /*************************************************
   *           Callbacks and Functions             *
   *************************************************/
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
          getTokenInfo(tokenBalances[index].address, provider).then(info => {
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
  }, [isMounted, provider, tokenBalances]);

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
