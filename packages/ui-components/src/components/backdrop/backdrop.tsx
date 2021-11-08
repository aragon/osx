import React from 'react';
import styled from 'styled-components';
export interface BackdropProps {
  /**
   * The `visible` prop determines whether your modal is visible.
   */
  visible?: boolean;
  /**
   * The `onClose` prop allows passing a function that will be called once the modal has been dismissed.
   * _On the Android platform, this is a required function._
   */
  onClose: () => void;
  /**
   * Children Element
   */
  children?: React.ReactNode;
}

/**
 * Primary UI component for user interaction
 */
export const Backdrop: React.FC<BackdropProps> = ({
  visible = false,
  children,
  onClose,
  ...props
}) => {
  // TODO:Implement Backdrop to use as wrapper
  return (
    <StyledBackdrop visible={visible} onClick={onClose} {...props}>
      {children}
    </StyledBackdrop>
  );
};

type StyledBackdropProps = {
  visible: boolean;
};

const StyledBackdrop = styled.div.attrs(({visible}: StyledBackdropProps) => {
  const className: string = visible
    ? 'visible opacity-100'
    : 'invisible opacity-0';

  const style: any = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      'linear-gradient(167.96deg, rgba(31, 41, 51, 0.24) 0%, #1F2933 100%)',
    transition: 'visibility 0.2s, opacity 0.2s linear',
    backdropFilter: 'blur(24px)',
    cursor: 'pointer',
  };

  return {className, style};
})<StyledBackdropProps>``;
