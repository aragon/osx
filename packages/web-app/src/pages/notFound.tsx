import React from 'react'

import { useTrackPage } from 'hooks/analytics-hooks'

const NotFound: React.FC = () => {
  useTrackPage()
  return <h1>404 Page not found</h1>
}

export default NotFound
