import React from 'react'
import ReactDOM from 'react-dom'

import App from './app'
import { WalletProvider } from './context/augmentedWallet'
import 'tailwindcss/tailwind.css'

ReactDOM.render(
  <React.StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </React.StrictMode>,
  document.getElementById('root')
)
