import {ValidateResult} from 'react-hook-form';
import {isAddress, parseUnits} from 'ethers/lib/utils';
import {BigNumber, providers as EthersProviders} from 'ethers';

import {i18n} from '../../i18n.config';
import {isERC20Token} from './tokens';

/**
 * Validate given token contract address
 *
 * @param address token contract address
 * @param provider rpc provider
 * @returns true when valid, or an error message when invalid
 */
export async function validateTokenAddress(
  address: string,
  provider: EthersProviders.Provider
): Promise<ValidateResult> {
  const result = validateAddress(address);

  if (result === true) {
    return (await isERC20Token(address, provider))
      ? true
      : (i18n.t('errors.notERC20Token') as string);
  } else {
    return result;
  }
}

/**
 * Validate given token amount
 *
 * @param amount token amount
 * @param decimals token decimals
 * @returns true when valid, or an error message when invalid
 */
export function validateTokenAmount(
  amount: string,
  decimals: number,
  balance = '0'
) {
  // A token with no decimals (they do exist in the wild)
  if (!decimals) {
    return amount.includes('.')
      ? (i18n.t('errors.includeExactAmount') as string)
      : true;
  }

  // Amount has no decimal point or no value after decimal point
  if (!amount.includes('.') || amount.split('.')[1] === '')
    return i18n.t('errors.includeDecimals') as string;

  // Number of characters after decimal point greater than
  // the number of decimals in the token itself
  if (amount.split('.')[1].length > decimals)
    return i18n.t('errors.exceedsFractionalParts', {decimals}) as string;

  // Amount less than or equal to zero
  if (BigNumber.from(parseUnits(amount, decimals)).lte(0))
    return i18n.t('errors.lteZero') as string;

  // Amount is greater than wallet/dao balance
  if (BigNumber.from(parseUnits(amount, decimals)).gt(parseUnits(balance)))
    return i18n.t('errors.insufficientBalance') as string;

  return true;
}

/**
 * Validate given wallet address
 *
 * @param address address to be validated
 * @returns true if valid, error message if invalid
 */
export const validateAddress = (address: string): ValidateResult => {
  return isAddress(address)
    ? true
    : (i18n.t('errors.invalidAddress') as string);
};
