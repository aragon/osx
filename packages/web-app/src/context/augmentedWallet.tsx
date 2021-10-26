import { UseWalletProvider } from 'use-wallet'
import React from 'react'

export const WalletProvider: React.FC<unknown> = ({ children }) => {
  return <UseWalletProvider chainId={1}>{children}</UseWalletProvider>
}
