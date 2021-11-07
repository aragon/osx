import React, {useEffect, useRef, HTMLAttributes, MouseEvent, KeyboardEvent} from 'react';

export interface EscapeOutsideProps extends HTMLAttributes<HTMLElement> {
  /**
   * Children Element
   */
  childern?: React.ReactNode;
  /**
   * onEscapeOutside Function
   */
  onEscapeOutside: () => void;
  /**
   * onEscapeOutside Function
   */
  useCapture: boolean;
}

/**
 * Primary UI component for user interaction
 */
export const EscapeOutside: React.FC<EscapeOutsideProps> = ({
  childern,
  onEscapeOutside,
  useCapture = false,
}) => {
  const element: any = useRef();
  let document: any = null;
  const KEY_ESC = 27

  useEffect(() => {
    document = element.ownerDocument;
    document.addEventListener('keydown', handleEscape, useCapture);
    document.addEventListener('click', handleClick, useCapture);
    document.addEventListener('touchend', handleClick, useCapture);
    return () => {
      document.removeEventListener('keydown', handleEscape, useCapture);
      document.removeEventListener('click', handleClick, useCapture);
      document.removeEventListener('touchend', handleClick, useCapture);
    };
  }, []);

  const handleClick = (e: MouseEvent<HTMLElement>) => {
    if (!element.contains(e.target)) {
      onEscapeOutside();
    }
  };

  const handleEscape = (e: KeyboardEvent<HTMLElement>) => {
    if (e.keyCode === KEY_ESC) {
      onEscapeOutside();
    }
  };

  return <div>{childern}</div>;
};
