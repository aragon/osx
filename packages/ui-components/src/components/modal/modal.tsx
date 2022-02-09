import React, {ReactNode, CSSProperties} from 'react';
import styled from 'styled-components';
import {Root, Title, Content, Close, Portal} from '@radix-ui/react-dialog';
import {Backdrop} from '../backdrop';
import {IconClose} from '../icons';

export interface ModalProps {
  /**
   * The controlled open state of the Modal.
   */
  isOpen?: boolean;
  /**
   * Modal title. if the title exists close button will appear
   */
  title?: string;
  /**
   * Modal subtitle
   */
  subtitle?: string;
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
  subtitle,
  children,
  isOpen = true,
  onClose,
  ...props
}) => {
  return (
    <>
      <Root open={isOpen}>
        <Portal>
          <Backdrop visible={isOpen} />
          <ModalContainer
            data-testid="modal-content"
            onInteractOutside={onClose}
            onEscapeKeyDown={onClose}
            {...props}
          >
            {title && (
              <ModalHeader>
                <ModalTitleContainer>
                  <ModalTitle>{title}</ModalTitle>
                  {subtitle && <ModalSubtitle>{subtitle}</ModalSubtitle>}
                </ModalTitleContainer>
                <ModalClose onClick={onClose}>
                  <IconClose height={10} width={10} className="mx-auto" />
                </ModalClose>
              </ModalHeader>
            )}
            {children}
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
  className:
    'flex justify-between items-start bg-white rounded-xl p-3 space-x-3',
})``;

const ModalTitleContainer = styled.div.attrs({
  className: 'space-y-0.5',
})``;

const ModalTitle = styled(Title).attrs({
  className: 'font-bold text-ui-800',
})``;

const ModalSubtitle = styled.div.attrs({
  className: 'text-sm text-ui-500',
})``;

const ModalClose = styled(Close).attrs({
  className:
    'flex-shrink-0 text-ui-500 w-4 h-4 rounded-lg bg-ui-50 outline:none',
})``;
