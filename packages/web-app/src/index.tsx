import React from 'react';
import ReactDOM from 'react-dom';
import {HashRouter as Router} from 'react-router-dom';

import App from './app';
import {WalletProvider} from 'context/augmentedWallet';
import {APMProvider} from 'context/elasticAPM';
import {MenuProvider} from 'context/menu';
import 'tailwindcss/tailwind.css';

ReactDOM.render(
  <React.StrictMode>
    <APMProvider>
      <WalletProvider>
        <MenuProvider>
          <Router>
            <App />
          </Router>
        </MenuProvider>
      </WalletProvider>
    </APMProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
