import React, {useEffect} from 'react';
import {ApmRoute as Route} from '@elastic/apm-rum-react';
import {Switch, useLocation, Redirect} from 'react-router-dom';

import Footer from 'containers/footer';
import Navbar from 'containers/navbar';
import WalletMenu from 'containers/walletMenu';
import {NotFound} from 'utils/paths';
import {trackPage} from 'services/analytics';
import {PageRoute, routes} from 'routes';
import '../i18n.config';

function App() {
  const {pathname} = useLocation();

  useEffect(() => {
    trackPage(pathname);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="bg-primary-50">
      <Navbar />
      <div className="min-h-screen">
        <Switch>
          {routes.map((route: PageRoute) => (
            <Route
              key={route.name}
              path={route.path}
              exact={route.exact}
              component={route.component}
            />
          ))}
          <Redirect from="*" to={NotFound} />
        </Switch>
      </div>
      <Footer />
      <WalletMenu />
    </div>
  );
}

export default App;
