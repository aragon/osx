import React from 'react'
import styled from 'styled-components'
import { useWallet } from '../../context/augmentedWallet'

const Wallet: React.FC = () => {
  const { account, balance, reset, connect, isConnected } = useWallet()

  return isConnected() ? (
    <div>
      <div>Account: {account}</div>
      <div>Balance: {balance}</div>
      <Button onClick={() => reset()}>disconnect</Button>
    </div>
  ) : (
    <div>
      Connect:
      <Button onClick={() => connect('injected')}>MetaMask</Button>
      <Button onClick={() => connect('frame')}>Frame</Button>
      <Button onClick={() => connect('portis')}>Portis</Button>
    </div>
  )
}

const Button = styled.button.attrs({
  className:
    'mx-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full'
})``

export default Wallet
