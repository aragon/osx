import {ethers, providers as EthersProviders} from 'ethers';
import {erc20TokenABI} from 'abis/erc20TokenABI';
import {BaseTokenInfo, TreasuryToken} from './types';
import {formatUnits} from 'utils/library';

/**
 * This method sorts a list of array information. It is applicable to any field
 * of the information object that can be compared using '<', '>'.
 *
 * @param tokens List of token (basic) token information
 * @param criteria Field of the information object that determines the sort
 * order. Must be a key of BaseTokenInfo.
 * @param reverse reverses the order in which the token are sorted. Note that in
 * either cases, any objects with undefined fields will moved to the end of the
 * array.
 *
 * @example sortTokens(baseTokenInfos[], 'name');
 * @example sortTokens(baseTokenInfos[], 'count');
 */
export function sortTokens<K extends keyof TreasuryToken>(
  tokens: TreasuryToken[],
  criteria: K,
  reverse = false
) {
  function sorter(a: TreasuryToken, b: TreasuryToken) {
    if (!a[criteria]) return 1; // ensure that undefined fields are placed last.
    if (a[criteria] < b[criteria]) {
      return -1;
    }
    if (a[criteria] > b[criteria]) {
      return 1;
    }
    return 0;
  }
  function reverseSorter(a: TreasuryToken, b: TreasuryToken) {
    if (!a[criteria]) return 1; // ensure that undefined fields are placed last.
    if (a[criteria] > b[criteria]) {
      return -1;
    }
    if (a[criteria] < b[criteria]) {
      return 1;
    }
    return 0;
  }

  tokens.sort(reverse ? reverseSorter : sorter);
}

/**
 * This method filters a list of array information. It searches the searchTerm
 * in the tokens name, symbol and address.
 *
 * @param tokens List of (basic) token information
 * @param searchTerm Term to search for in information
 * @returns Filtered list of (basic) token information that contains search
 * term.
 */
export function filterTokens(tokens: BaseTokenInfo[], searchTerm: string) {
  function tokenInfoMatches(token: BaseTokenInfo, term: string) {
    const lowercaseTerm = term.toLocaleLowerCase();
    const lowercaseSymbol = token.symbol.toLocaleLowerCase();
    const lowercaseAddress = token.address.toLocaleLowerCase();
    const lowercaseName = token.name.toLocaleLowerCase();
    return (
      lowercaseSymbol.indexOf(lowercaseTerm) >= 0 ||
      lowercaseName.indexOf(lowercaseTerm) >= 0 ||
      lowercaseAddress.indexOf(lowercaseTerm) >= 0
    );
  }

  if (!searchTerm) return tokens;

  return tokens.filter(t => tokenInfoMatches(t, searchTerm));
}

/**
 * This Validation function prevents sending broken
 * addresses that may cause subgraph crash
 *
 * @param address Wallet Address
 * @param provider Eth provider
 * @returns boolean determines whether it is erc20 compatible or not
 */

export async function isTokenERC20(
  address: string,
  provider: EthersProviders.Provider
) {
  const contract = new ethers.Contract(address, erc20TokenABI, provider);
  try {
    await Promise.all([contract.balanceOf(address), contract.totalSupply()]);
    return true;
  } catch (err) {
    return false;
  }
}
/**
 * This Function is necessary because
 * you can't fetch decimals from the api
 *
 * @param address token contract address
 * @param provider Eth provider
 * @returns number for decimals for each token
 */
export async function getTokenInfo(
  address: string,
  provider: EthersProviders.Provider
) {
  const contract = new ethers.Contract(address, erc20TokenABI, provider);
  const [decimals, name, symbol] = await Promise.all([
    contract.decimals(),
    contract.name(),
    contract.symbol(),
  ]);
  return {
    decimals,
    name,
    symbol,
  };
}

/**
 * @param tokenAddress address of token contract
 * @param ownerAddress owner address / wallet address
 * @param provider interface to node
 * @returns a promise that will return a balance amount
 */
export const fetchBalance = async (
  tokenAddress: string,
  ownerAddress: string,
  provider: EthersProviders.Provider
) => {
  const contract = new ethers.Contract(tokenAddress, erc20TokenABI, provider);
  const balance = await contract.balanceOf(ownerAddress);
  const {decimals, symbol} = await getTokenInfo(tokenAddress, provider);

  return {amount: formatUnits(balance, decimals), symbol};
};
