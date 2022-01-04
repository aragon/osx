// NOTE Eventually have these types expressed as string patterns [VR 22-11-2021].
export type Address = string;
export type EnsName = string;

// get truncated address
export function shortenAddress(address: Address | null) {
  if (address === null) return '';
  if (IsAddress(address))
    return (
      address.substring(0, 5) +
      '...' +
      address.substring(address.length - 4, address.length)
    );
  else return address;
}

// check label type
export function IsAddress(address: Address | null) {
  const re = /0x[a-fA-F0-9]{40}/g;
  return Boolean(address?.match(re));
}
