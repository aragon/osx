import {useCallback, useState} from 'react';

import useInterval from 'hooks/useInterval';
import useIsMounted from 'hooks/useIsMounted';
import {fetchTokenMarketData} from 'services/prices';

import type {HookData, BaseTokenInfo, PricedToken} from 'utils/types';

/**
 * Hook for fetching token prices at specified intervals
 * @param tokenList List of token ids to fetch USD  value for
 * @param interval Delay in milliseconds
 * @returns Object with key value pairs corresponding to token address and USD value respectively.
 * If USD value isn't found, returns null for token price.
 */
export const usePollTokens = (
  tokenList: BaseTokenInfo[],
  interval?: number
) => {
  const isMounted = useIsMounted();
  const [error, setError] = useState<Error>();
  const [prices, setPrices] = useState<PricedToken[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchPrices = useCallback(async () => {
    setIsLoading(true);

    try {
      const tokenIds = tokenList.map(token => token.id).join(',');
      const pricedTokens = await fetchTokenMarketData(tokenIds);

      const tokens = tokenList.map(token => {
        return {
          ...token,
          ...(token.id && pricedTokens ? pricedTokens[token.id] : {}),
        };
      });

      if (isMounted()) {
        setPrices([...tokens]);
        setIsLoading(false);
      }
    } catch (error) {
      setError(error as Error);
      console.error(error);
    }
  }, [isMounted, tokenList]);

  useInterval(() => fetchPrices(), interval, tokenList.length > 0);

  return {data: prices, error, isLoading} as HookData<PricedToken[]>;
};
