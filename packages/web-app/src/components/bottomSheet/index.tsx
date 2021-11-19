import React, {useEffect, ReactNode} from 'react';
import {motion, PanInfo, useAnimation} from 'framer-motion';
import {Backdrop} from '@aragon/ui-components';
import styled from 'styled-components';

import usePrevious from 'hooks/usePrevious';

type InputProps = {
  children?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
};

export default function BottomSheet({
  children,
  isOpen,
  onClose,
  onOpen,
}: InputProps) {
  const prevIsOpen = usePrevious(isOpen);
  const controls = useAnimation();

  // For adding drag on bottom sheet
  function onDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
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
      <StyledMotionContainer
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
      >
        {children}
      </StyledMotionContainer>
    </>
  );
}

const StyledMotionContainer = styled(motion.div).attrs({
  className: 'block fixed bottom-0 bg-white w-full',
})`
  border-radius: 12px 12px 0px 0px;
  &:before {
    content: '';
    display: inline-block;
    background: #e4e7eb;
    width: 120px;
    height: 6px;
    border-radius: 8px;
    position: absolute;
    margin: 0px auto 0px auto;
    left: 0;
    right: 0;
    top: -14px;
  }
`;
