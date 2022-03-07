import {useState, useEffect} from 'react';
import {constants} from 'ethers';
import {formatUnits} from 'ethers/lib/utils';

import {isETH, fetchBalance} from 'utils/tokens';
import {useWallet} from 'context/augmentedWallet';
import {useWalletProps} from 'containers/walletMenu';
import {TokenBalance} from 'utils/types';

// TODO return as HookData
export function useWalletTokens() {
  const {account, chainId, provider, getTokenList, balance}: useWalletProps =
    useWallet();
  const [walletTokens, setWalletTokens] = useState<TokenBalance[]>([]);

  // fetch tokens and corresponding balance on wallet
  useEffect(() => {
    async function fetchWalletTokens() {
      if (account === null) {
        setWalletTokens([]);
        return;
      }

      const tokenList = await getTokenList();
      if (Number(balance) !== -1 && Number(balance) !== 0)
        await tokenList.push(constants.AddressZero);

      // get tokens balance from wallet
      const balances = await Promise.all(
        tokenList.map(address => {
          if (isETH(address)) return formatUnits(balance, 18);
          else return fetchBalance(address, account, provider, false);
        })
      );

      // map tokens with their balance
      setWalletTokens(
        tokenList?.map((token, index) => ({
          address: token,
          count: balances[index],
        }))
      );
    }

    fetchWalletTokens();
  }, [account, balance, chainId, getTokenList, provider]);

  return walletTokens;
}
