import {constants} from 'ethers';

const BASE_URL = 'https://api.0x.org';
const BUY_TOKEN = 'USDC';
const DEFAULT_SELL_AMOUNT = '1000000000000000000';

/**
 * Get the base unit of a token
 * @param decimals - ERC20 token decimals
 * @returns One unit of the token
 */
const getSellAmount = (decimals?: number | string) => {
  // 18 decimals by default
  if (!decimals) return DEFAULT_SELL_AMOUNT;

  if (Number.isInteger(decimals as number))
    return Math.pow(10, Number(decimals));
  else throw new TypeError('decimals must be a valid whole number');
};

/**
 * Fetch the price of a given token
 * Note: currently gas prices are NOT factored in
 * @param token Token contract address or token symbol
 * @param decimals Token decimals; defaults to 18
 * @returns The approximate USD value (based on USDC) for given token
 */
const fetchTokenUsdPrice = async (
  token: string,
  decimals?: string | number
) => {
  const sellToken = token === constants.AddressZero ? 'ETH' : token;
  try {
    const response = await fetch(
      `${BASE_URL}/swap/v1/price?sellAmount=${getSellAmount(
        decimals
      )}&sellToken=${sellToken}&buyToken=${BUY_TOKEN}`
    );

    const {price} = await response.json();
    return price as string;
  } catch (error) {
    console.error(`Could not fetch ${token} USD price`, error);
  }
};

export {fetchTokenUsdPrice};
