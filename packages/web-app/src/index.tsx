import React from 'react';
import ReactDOM from 'react-dom';
import {HashRouter as Router} from 'react-router-dom';

import App from './app';
import {WalletProvider} from 'context/augmentedWallet';
import {APMProvider} from 'context/elasticAPM';
import {WalletMenuProvider} from 'context/walletMenu';
import {TransferModalsProvider} from 'context/transfersModal';
import 'tailwindcss/tailwind.css';

ReactDOM.render(
  <React.StrictMode>
    <APMProvider>
      <WalletProvider>
        <WalletMenuProvider>
          <TransferModalsProvider>
            <Router>
              <App />
            </Router>
          </TransferModalsProvider>
        </WalletMenuProvider>
      </WalletProvider>
    </APMProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
