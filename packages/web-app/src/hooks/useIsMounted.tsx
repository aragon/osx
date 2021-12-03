import {useCallback, useEffect, useRef} from 'react';

/**
 * Hook to determine if component is mounted before updating the state,
 * thereby preventing a memory leak
 * @returns Whether the current component is mounted.
 */
const useIsMounted = () => {
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  return useCallback(() => mounted.current, []);
};

export default useIsMounted;
