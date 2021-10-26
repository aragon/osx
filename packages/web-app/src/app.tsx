import React from 'react'
import { Route, HashRouter as Router, Switch } from 'react-router-dom'

import '../i18n.config'

import Footer from './containers/footer'
import Navbar from './containers/navbar'
import { PageRoute, routes } from './routes'

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
              exact
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
