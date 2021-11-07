import React, {useEffect, useRef} from 'react';
import {motion, useAnimation} from 'framer-motion';

type InputProps = {
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

export default function BottomSheet({isOpen, onClose, onOpen}: InputProps) {
  const prevIsOpen = usePrevious(isOpen);
  const controls = useAnimation();

  function onDragEnd(event: any, info: any) {
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

  useEffect(() => {
    if (prevIsOpen && !isOpen) {
      controls.start('hidden');
    } else if (!prevIsOpen && isOpen) {
      controls.start('visible');
    }
  }, [controls, isOpen, prevIsOpen]);

  return (
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
        visible: {y: 0, height: 100},
        hidden: {y: 100, height: 100},
      }}
      dragConstraints={{top: 0}}
      dragElastic={0.2}
      style={{
        display: 'block',
        position: 'absolute',
        bottom: 0,
        backgroundColor: 'blue',
        width: '100%',
        height: 100,
        borderTopRightRadius: 10,
        borderTopLeftRadius: 10,
      }}
    />
  );
}
