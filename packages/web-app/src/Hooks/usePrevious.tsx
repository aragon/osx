import {useEffect, useRef} from 'react';

export default function usePrevious(value: boolean) {
  const previousValueRef = useRef<boolean>();

  useEffect(() => {
    previousValueRef.current = value;
  }, [value]);

  return previousValueRef.current;
}
