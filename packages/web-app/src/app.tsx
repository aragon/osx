import React from 'react'
import { ApmRoute as Route } from '@elastic/apm-rum-react'
import { HashRouter as Router, Switch } from 'react-router-dom'

import Footer from 'containers/footer'
import Navbar from 'containers/navbar'
import { PageRoute, routes } from 'routes'
import '../i18n.config'

function App() {
  return (
    <Router>
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
    </Router>
  )
}

export default App
