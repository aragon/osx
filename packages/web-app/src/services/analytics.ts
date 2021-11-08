enum MethodType {
  PAGE,
  IDENTIFY,
  EVENT,
}

/**
 * This private method extracts the necessary method from the global window object.
 *
 * @param methodType Type of analytics to track
 * @returns the corresponding analytics method
 */
function getAnalyticsMethod(methodType: MethodType) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const windowAnalytics = (window as any).rudderanalytics;
  if (!windowAnalytics) {
    return;
  }
  if (methodType === MethodType.PAGE) return windowAnalytics.page;
  if (methodType === MethodType.IDENTIFY) return windowAnalytics.identify;
  if (methodType === MethodType.EVENT) return windowAnalytics.track;
}

/**
 * Sends analytics information about the pages visited.
 *
 * @param pathName (Dynamic) Path name as given by the react router.
 * @returns void
 */
export function trackPage(pathName: string) {
  const trackerMethod = getAnalyticsMethod(MethodType.PAGE);
  if (typeof trackerMethod !== 'function') {
    return;
  }
  trackerMethod({
    path: pathName,
  });
}

/**
 * Sends analytics informations about the connected wallets.
 *
 * @param {String} account Wallet address
 * @param {String} networkType The network the wallet is connected to
 * @param {String} connector Wallet connector used by use-wallet library
 * @returns {void}
 */
export function identifyUser(
  account: string,
  networkType: string,
  connector: string
) {
  const trackerMethod = getAnalyticsMethod(MethodType.IDENTIFY);
  if (typeof trackerMethod !== 'function') {
    return;
  }
  const walletData = {
    wallet_address: account,
    wallet_provider: connector,
    network: networkType,
  };
  trackerMethod(walletData);
}
