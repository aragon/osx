export interface TokenConfig {
  addr: string;
  name: string;
  symbol: string;
}

export interface MintConfig {
  receivers: string[];
  amounts: number[];
}
