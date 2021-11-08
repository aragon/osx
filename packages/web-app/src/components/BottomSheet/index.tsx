import React, {useEffect, useRef, ReactNode} from 'react';
import {motion, useAnimation} from 'framer-motion';
import {Backdrop} from '@aragon/ui-components';

type InputProps = {
  children?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
};

function usePrevious(value: boolean) {
  const previousValueRef = useRef<boolean>();

  useEffect(() => {
    previousValueRef.current = value;
  }, [value]);

  return previousValueRef.current;
}

export default function BottomSheet({
  children,
  isOpen,
  onClose,
  onOpen,
}: InputProps) {
  const prevIsOpen = usePrevious(isOpen);
  const controls = useAnimation();

  // For adding drag on bottom sheet
  function onDragEnd(event: MouseEvent | TouchEvent | PointerEvent, info: any) {
    const shouldClose =
      info.velocity.y > 20 || (info.velocity.y >= 0 && info.point.y > 45);
    if (shouldClose) {
      controls.start('hidden');
      onClose();
    } else {
      controls.start('visible');
      onOpen();
    }
  }
  // For Run animation on each state change
  useEffect(() => {
    if (prevIsOpen && !isOpen) {
      controls.start('hidden');
    } else if (!prevIsOpen && isOpen) {
      controls.start('visible');
    }
  }, [controls, isOpen, prevIsOpen]);

  return (
    <>
      <Backdrop visible={isOpen} onClose={onClose} />
      <motion.div
        drag="y"
        onDragEnd={onDragEnd}
        initial="hidden"
        animate={controls}
        transition={{
          type: 'spring',
          damping: 40,
          stiffness: 400,
        }}
        variants={{
          visible: {y: 0, height: 200},
          hidden: {y: 100, height: 0},
        }}
        dragConstraints={{top: 0}}
        dragElastic={0.2}
        style={{
          display: 'block',
          position: 'fixed',
          bottom: 0,
          backgroundColor: '#FFFFFF',
          width: '100%',
          borderRadius: '12px 12px 0px 0px',
        }}
      >
        {children}
      </motion.div>
    </>
  );
}
