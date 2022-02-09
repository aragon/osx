import React, {useEffect, ReactNode} from 'react';
import {motion, PanInfo, useAnimation} from 'framer-motion';
import {Backdrop} from '@aragon/ui-components';
import styled from 'styled-components';

import usePrevious from 'hooks/usePrevious';

type InputProps = {
  children?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
};

export default function BottomSheet({
  children,
  isOpen,
  onClose,
  title,
  subtitle,
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
          visible: {y: 0, height: 'auto'},
          hidden: {y: 100, height: 0},
        }}
        dragConstraints={{top: 0}}
        dragElastic={0.2}
      >
        {title && (
          <ModalTitleContainer>
            <ModalTitle>{title}</ModalTitle>
            {subtitle && <ModalSubtitle>{subtitle}</ModalSubtitle>}
          </ModalTitleContainer>
        )}
        {children}
      </StyledMotionContainer>
    </>
  );
}

const StyledMotionContainer = styled(motion.div).attrs({
  className:
    'bg-ui-50 block fixed bottom-0 tablet:bottom-3 w-full tablet:w-max rounded-t-xl tablet:rounded-xl tablet:left-0 tablet:right-0 tablet:mx-auto',
})`
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

const ModalTitleContainer = styled.div.attrs({
  className: 'bg-white rounded-xl p-3 space-y-0.5 text-center',
})``;

const ModalTitle = styled.h1.attrs({
  className: 'font-bold text-ui-800',
})``;

const ModalSubtitle = styled.div.attrs({
  className: 'text-sm text-ui-500',
})``;
