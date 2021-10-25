import React from 'react'
import styled from 'styled-components'
import { useWallet } from 'use-wallet'

function App() {
  const wallet = useWallet()
  const blockNumber = wallet.getBlockNumber()

  return (
    <div className="bg-white">
      <div className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 mx-auto max-w-screen-xl">
        <div className="text-center">
          <WelcomeMessage>Welcome to</WelcomeMessage>
          <Title>Zaragoza</Title>
          <Subtitle>The human centered Dao infrastructure.</Subtitle>
        </div>
      </div>
      <h1>Wallet</h1>
      {wallet.status === 'connected' ? (
        <div>
          <div>Account: {wallet.account}</div>
          <div>Balance: {wallet.balance}</div>
          <Button onClick={() => wallet.reset()}>disconnect</Button>
        </div>
      ) : (
        <div>
          Connect:
          <Button onClick={() => wallet.connect()}>MetaMask</Button>
          <Button onClick={() => wallet.connect('frame')}>Frame</Button>
          <Button onClick={() => wallet.connect('portis')}>Portis</Button>
        </div>
      )}
    </div>
  )
}

const WelcomeMessage = styled.h2.attrs({
  className: 'text-base font-semibold tracking-wide text-blue-600 uppercase'
})``
const Title = styled.p.attrs({
  className:
    'my-3 text-4xl sm:text-5xl lg:text-6xl font-bold sm:tracking-tight text-gray-900'
})``
const Subtitle = styled.p.attrs({
  className:
    'my-3 text-4xl sm:text-5xl lg:text-6xl font-bold sm:tracking-tight text-gray-900'
})``
const Button = styled.button.attrs({
  className:
    'mx-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full'
})``

export default App
