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
  children?: any;
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
  return (
    <StyledBackdrop visible={visible} onClick={()=>{
      onClose();
      }} {...props}>
      {children}
    </StyledBackdrop>
  );
};

type StyledBackdropProps = {
  visible: boolean;
}

const StyledBackdrop = styled.div.attrs(({visible}: StyledBackdropProps) => {
  const className: string = visible ? 'block' : 'hidden';

  const style: any = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(97, 110, 124, 0.5)',
    backdropFilter: 'blur(40px)',
    cursor: 'pointer'
  };

  return {className, style};
})<StyledBackdropProps>``;