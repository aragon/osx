import {I18nextProvider} from 'react-i18next';
import React, {ReactElement} from 'react';
import {HashRouter as Router} from 'react-router-dom';
import {render, RenderOptions} from '@testing-library/react';

import {i18n} from '../../i18n.config';
import {WalletMenuProvider} from 'context/walletMenu';
import {WalletProvider} from 'context/augmentedWallet';

const AllProviders: React.FC = ({children}) => {
  return (
    <WalletProvider>
      <WalletMenuProvider>
        <I18nextProvider i18n={i18n}>
          <Router>{children}</Router>
        </I18nextProvider>
      </WalletMenuProvider>
    </WalletProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, {wrapper: AllProviders, ...options});

export * from '@testing-library/react';
export {customRender as render};
