import React from 'react'
import ReactDOM from 'react-dom'
import { HashRouter as Router } from 'react-router-dom'

import App from 'app'
import { WalletProvider } from 'context/augmentedWallet'
import 'tailwindcss/tailwind.css'

ReactDOM.render(
  <React.StrictMode>
    <WalletProvider>
      <Router>
        <App />
      </Router>
    </WalletProvider>
  </React.StrictMode>,
  document.getElementById('root')
)
