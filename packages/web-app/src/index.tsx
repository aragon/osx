import React from 'react'
import ReactDOM from 'react-dom'
import 'tailwindcss/tailwind.css'
import { WalletProvider } from './providers/AugmentedWallet'
import App from './App'

ReactDOM.render(
  <React.StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </React.StrictMode>,
  document.getElementById('root')
)
