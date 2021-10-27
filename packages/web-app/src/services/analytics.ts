enum MethodType {
  PAGE
}

/**
 * This private method extracts the necessary method from the global window object.
 *
 * @param methodType Type of analytics to track
 * @returns the corresponding analytics method
 */
function getAnalyticsMethod(methodType: MethodType) {
  const windowAnalytics = (window as any).rudderanalytics
  if (!windowAnalytics) {
    return
  }
  if (methodType === MethodType.PAGE) return windowAnalytics.page
}

/**
 * Sends analytics information about the pages visited.
 *
 * @param pathName (Dynamic) Path name as given by the react router.
 * @returns void
 */
export function trackPage(pathName: string) {
  const trackerMethod = getAnalyticsMethod(MethodType.PAGE)
  if (typeof trackerMethod !== 'function') {
    return
  }
  trackerMethod({
    path: pathName
  })
}
