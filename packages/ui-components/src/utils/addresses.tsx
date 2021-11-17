// get truncated address
export function BeautifyLabel(label: string | null) {
    if (label === null) return '';
    if(IsAddress(label))
      return (
        label.substring(0, 5) +
        '...' +
        label.substring(label.length - 4, label.length)
      );
    else return label
  }
  
  // check label type
  export function IsAddress(address: string | null) {
    const re = /0x[a-fA-F0-9]{40}/g;
    return Boolean(address?.match(re));
  }