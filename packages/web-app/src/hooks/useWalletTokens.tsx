import {constants} from 'ethers';
import {formatUnits, Interface, getAddress, hexZeroPad} from 'ethers/lib/utils';
import {Log} from '@ethersproject/providers';
import {useState, useEffect} from 'react';

import {erc20TokenABI} from 'abis/erc20TokenABI';
import {useWallet} from 'context/augmentedWallet';
import {useProviders} from 'context/providers';
import {useWalletProps} from 'containers/walletMenu';
import {isETH, fetchBalance} from 'utils/tokens';
import {HookData, TokenBalance} from 'utils/types';

// TODO The two hooks in this file are very similar and should probably be
// merged into one. The reason I'm not doing it now is that I'm not sure if
// there is a situation where it makes sense have only the addresses. If that's
// not the case we should merge them. [VR 07-03-2022]

/**
 * Returns a list of token addresses for which the currently connected wallet
 * has balance.
 */
export function useUserTokenAddresses(): HookData<string[]> {
  const {account} = useWallet();
  const {web3} = useProviders();

  const [tokenList, setTokenList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    async function fetchTokenList() {
      setIsLoading(true);

      if (web3 && account) {
        try {
          const erc20Interface = new Interface(erc20TokenABI);
          const latestBlockNumber = await web3.getBlockNumber();

          // Get all transfers sent to the input address
          const transfers: Log[] = await web3.getLogs({
            fromBlock: 0,
            toBlock: latestBlockNumber,
            topics: [
              erc20Interface.getEventTopic('Transfer'),
              null,
              hexZeroPad(account as string, 32),
            ],
          });
          // Filter unique token contract addresses and convert all events to Contract instances
          const tokens = await Promise.all(
            transfers
              .filter(
                (event, i) =>
                  i ===
                  transfers.findIndex(other => event.address === other.address)
              )
              .map(event => getAddress(event.address))
          );
          setTokenList(tokens);
        } catch (error) {
          setError(new Error('Failed to fetch ENS name'));
          console.error(error);
        }
      } else {
        setTokenList([]);
      }
      setIsLoading(false);
    }

    fetchTokenList();
  }, [account, web3]);

  return {data: tokenList, isLoading, error};
}

/**
 * Returns a list of token balances for the currently connected wallet.
 *
 * This is hook is very similar to useUserTokenAddresses, but in addition to the
 * contract address it also returns the user's balance for each of the tokens.
 */
export function useWalletTokens(): HookData<TokenBalance[]> {
  const {account, balance}: useWalletProps = useWallet();
  const {infura: provider} = useProviders();
  const {
    data: tokenList,
    isLoading: tokenListLoading,
    error: tokenListError,
  } = useUserTokenAddresses();

  const [walletTokens, setWalletTokens] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  // fetch tokens and corresponding balance on wallet
  useEffect(() => {
    async function fetchWalletTokens() {
      setIsLoading(true);
      if (account === null || provider === null) {
        setWalletTokens([]);
        return;
      }

      if (Number(balance) !== -1 && Number(balance) !== 0)
        tokenList.push(constants.AddressZero);

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
      setIsLoading(false);
    }

    if (tokenListLoading) return;
    if (tokenListError) {
      setError(tokenListError);
      return;
    }
    fetchWalletTokens();
  }, [account, balance, tokenList, provider, tokenListLoading, tokenListError]);

  return {data: walletTokens, isLoading: tokenListLoading || isLoading, error};
}
