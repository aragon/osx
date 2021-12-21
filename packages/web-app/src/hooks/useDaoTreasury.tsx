import {useMemo} from 'react';
import {formatUnits} from 'ethers/lib/utils';

import {TimeFilter} from 'utils/constants';
import {useDaoTokens} from './useDaoTokens';
import {useTokenInfo} from './useTokenInformation';
import {usePollTokens} from './usePollTokens';
import type {HookData, TreasuryToken} from 'utils/types';

type DaoTreasury = {
  tokens: TreasuryToken[];
  totalAssetValue: number;
  totalAssetChange: number;
};

// TODO: Explore options. This might be best on a context around the financial pages
// Would save however many calls is made in one go

/**
 * Hook encapsulating the logic for fetching the assets from the DAO vault and mapping them
 * to their corresponding USD market values.
 * @param daoAddress Dao address
 * @param filter Time filter to get data
 * @returns A list of tokens in the DAO treasury, current USD sum value of all assets,
 * and the price change in USD based on the filter
 */
export const useDaoTreasury = (daoAddress: string, filter: TimeFilter) => {
  const {data: daoTokens, isLoading: daoLoading} = useDaoTokens(daoAddress);
  const {data: baseTokens, isLoading: baseLoading} = useTokenInfo(daoTokens);
  const {data: pricedTokens, isLoading: pricedLoading} =
    usePollTokens(baseTokens);

  const mapToTreasury = useMemo(() => {
    let totalAssetValue = 0;
    let totalAssetChange = 0; // currency change

    // Get total value and changes of all assets
    const percentagedTokens: TreasuryToken[] = pricedTokens.map(token => {
      if (!token.price || !token.percentages) {
        return token;
      }

      const treasuryShare =
        token.price * Number(formatUnits(token.count, token.decimals));

      const changeDuringInterval =
        treasuryShare * (token.percentages[filter] / 100);

      // Update sums
      totalAssetValue += treasuryShare;
      totalAssetChange += changeDuringInterval;

      return {
        ...token,
        treasuryShare,
        changeDuringInterval,
        percentageChangeDuringInterval: token.percentages[filter],
      };
    });

    // get treasury share for tokens
    const tokens = percentagedTokens.map(token => {
      if (!token.price || !token.treasuryShare) return token;

      return {
        ...token,
        treasurySharePercentage: (token.treasuryShare / totalAssetValue) * 100,
      };
    });

    return {
      tokens,
      totalAssetValue,
      totalAssetChange: totalAssetChange,
    };
  }, [filter, pricedTokens]);

  return {
    data: {...mapToTreasury},
    isLoading: useMemo(
      () => daoLoading || baseLoading || pricedLoading,
      [baseLoading, daoLoading, pricedLoading]
    ),
  } as HookData<DaoTreasury>;
};
