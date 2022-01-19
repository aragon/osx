// Library utils / Ethers for now
import {BigNumberish, ethers} from 'ethers';

export function formatUnits(amount: BigNumberish, decimals: number) {
  if (amount.toString().includes('.') || !decimals) {
    return amount.toString();
  }
  return ethers.utils.formatUnits(amount, decimals);
}

// (Temporary) Should be moved to ui-component perhaps
/**
 * Handles copying and pasting to and from the clipboard respectively
 * @param currentValue field value
 * @param onChange on value change callback
 */
export async function handleClipboardActions(
  currentValue: string,
  onChange: (value: string) => void
) {
  if (currentValue) {
    await navigator.clipboard.writeText(currentValue);

    // TODO: change to proper mechanism
    alert('Copied');
  } else {
    const textFromClipboard = await navigator.clipboard.readText();
    onChange(textFromClipboard);
  }
}
