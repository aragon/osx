import { useEffect } from 'react'
import { useLocation } from 'react-router'

import { trackPage } from 'services/analytics'

/**
 * Sends information about page loaded
 */
export function useTrackPage() {
  const { pathname } = useLocation()

  useEffect(() => {
    trackPage(pathname)
  }, [pathname])
}
