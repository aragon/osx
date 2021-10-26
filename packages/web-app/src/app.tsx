import React from 'react'

import '../i18n.config'

import Home from './pages/home'
import Footer from './containers/footer'
import Navbar from './containers/navbar'

function App() {
  return (
    <>
      <Navbar />
      <div className="h-screen">
        <Home />
      </div>
      <Footer />
    </>
  )
}

export default App
