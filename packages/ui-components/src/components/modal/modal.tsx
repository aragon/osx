import React, {ReactNode, CSSProperties} from 'react';
import styled from 'styled-components';
import {Root, Title, Content, Close, Portal} from '@radix-ui/react-dialog';
import {Backdrop} from '../backdrop';
import {IconClose} from '../icons';

export interface ModalProps {
  /**
   * The controlled open state of the Modal.
   */
  open?: boolean;
  /**
   * Event handler called when the open state of the Modal changes.
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * Modal title. if the title exists close button will appear
   */
  title?: string;
  /**
   * Content
   */
  children: ReactNode;
  /**
   * Styles
   */
  style?: CSSProperties | undefined;
  /**
   * The `onClose` prop allows passing a function that will be called once the modal has been dismissed.
   */
  onClose?: () => void;
}

/**
 * Default UI component
 */
export const Modal: React.FC<ModalProps> = ({
  title,
  children,
  open = true,
  onOpenChange,
  onClose,
  ...props
}) => {
  return (
    <>
      <Root {...{open, onOpenChange}}>
        <Portal>
          <Backdrop visible={open} />
          <ModalContainer
            data-testid="modal-content"
            onInteractOutside={onClose}
            onEscapeKeyDown={onClose}
            {...props}
          >
            {title && (
              <ModalHeader>
                <ModalTitle>{title}</ModalTitle>
                <ModalClose onClick={onClose}>
                  <IconClose height={10} width={10} className="mx-auto" />
                </ModalClose>
              </ModalHeader>
            )}
            <ModalChildren>{children}</ModalChildren>
          </ModalContainer>
        </Portal>
      </Root>
    </>
  );
};

type StyledContentProps = Pick<ModalProps, 'style'>;

const ModalContainer = styled(Content).attrs(({style}: StyledContentProps) => {
  const className = 'bg-ui-50';
  const currentStyle: CSSProperties = style || {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -60%)',
    boxShadow:
      '0px 24px 32px rgba(31, 41, 51, 0.04), 0px 16px 24px rgba(31, 41, 51, 0.04), 0px 4px 8px rgba(31, 41, 51, 0.04), 0px 0px 1px rgba(31, 41, 51, 0.04)',
    borderRadius: 12,
    width: '90vw',
    maxWidth: '437px',
    maxHeight: '85vh',
    outline: 'none',
    overflow: 'auto',
  };

  return {style: currentStyle, className};
})<StyledContentProps>``;

const ModalHeader = styled.div.attrs({
  className: 'flex justify-between items-center bg-white rounded-xl p-3',
})``;

const ModalTitle = styled(Title).attrs({
  className: 'font-bold text-ui-800',
})``;

const ModalClose = styled(Close).attrs({
  className: 'text-ui-500 w-4 h-4 rounded-lg bg-ui-50 outline:none',
})``;

const ModalChildren = styled.div.attrs({
  className: 'p-3',
})``;
