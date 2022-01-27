export const erc20TokenABI = [
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function allowed(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 value) returns (bool)',
  'function balanceOf(address who) public view returns (uint256)',
  'function totalSupply() public view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function name() view returns (string)',
  'function symbol() public view returns (string)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];
