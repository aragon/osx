import React from 'react'
import ReactDOM from 'react-dom'

import App from './app'
import { WalletProvider } from './context/augmentedWallet'
import { APMProvider } from './context/elasticAPM';
import 'tailwindcss/tailwind.css'

ReactDOM.render(
  <React.StrictMode>
    <APMProvider>
      <WalletProvider>
        <App />
      </WalletProvider>
    </APMProvider>
  </React.StrictMode>,
  document.getElementById('root')
)
