import {useEffect, useLayoutEffect, useRef} from 'react';

const DEFAULT_INTERVAL = 300000; //interval in ms

/**
 * Hook running callback at specified interval
 * @param callback Function to run after each interval. Defaults to 300000ms
 * @param interval Delay in milliseconds
 * @param reset Resets hook; used callback expects async data
 */
const useInterval = (
  callback: () => void,
  interval: number = DEFAULT_INTERVAL,
  reset?: boolean
) => {
  const latestCallback = useRef(callback);

  useLayoutEffect(() => {
    latestCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    // Run immediately
    latestCallback.current();

    const setIntervalId = setInterval(() => latestCallback.current(), interval);
    return () => clearInterval(setIntervalId);
  }, [interval, reset]);
};

export default useInterval;
