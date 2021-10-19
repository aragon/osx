import React from 'react'
import styled from 'styled-components'

function App() {
  return (
    <div className="bg-white">
      <div className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 mx-auto max-w-screen-xl">
        <div className="text-center">
          <WelcomeMessage>Welcome to</WelcomeMessage>
          <Title>Zaragoza</Title>
          <Subtitle>The human centered Dao infrastructure.</Subtitle>
        </div>
      </div>
    </div>
  )
}

const WelcomeMessage = styled.h2.attrs({
  className: 'text-base font-semibold tracking-wide text-blue-600 uppercase'
})``
const Title = styled.p.attrs({
  className:
    'my-3 text-4xl sm:text-5xl lg:text-6xl font-bold sm:tracking-tight text-gray-900'
})``
const Subtitle = styled.p.attrs({
  className:
    'my-3 text-4xl sm:text-5xl lg:text-6xl font-bold sm:tracking-tight text-gray-900'
})``

export default App
