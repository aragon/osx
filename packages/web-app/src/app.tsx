import React, {useEffect} from 'react';
import {ApmRoute as Route} from '@elastic/apm-rum-react';
import {Switch, useLocation} from 'react-router-dom';

import Footer from 'containers/footer';
import Navbar from 'containers/navbar';
import {trackPage} from 'services/analytics';
import {PageRoute, routes} from 'routes';
import '../i18n.config';

function App() {
  const {pathname} = useLocation();

  useEffect(() => {
    trackPage(pathname);
  }, [pathname]);

  return (
    <>
      <Navbar />
      <div className="h-screen">
        <Switch>
          {routes.map((route: PageRoute) => (
            <Route
              key={route.name}
              path={route.path}
              exact={route.exact}
              component={route.component}
            />
          ))}
        </Switch>
      </div>
      <Footer />
    </>
  );
}

export default App;
