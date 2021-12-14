import React, {ReactNode, CSSProperties} from 'react';
import styled from 'styled-components';
import {Root, Title, Content, Close} from '@radix-ui/react-dialog';
import {Backdrop} from '../backdrop';
import {IconClose} from '../icons'

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
      <Root {...{ open, onOpenChange }}>
        <Backdrop visible={open}/>
        <ModalContainer
          data-testid="modal-content"
          onInteractOutside={onClose}
          {...props}
          >
          {title && <ModalHeader>
            <ModalTitle>{title}</ModalTitle>
            <ModalClose onClick={onClose}>
              <IconClose height={14} width={14} />
            </ModalClose>
          </ModalHeader>}
          {children}
        </ModalContainer>
      </Root>
    </>
  );
};


type StyledContentProps = Pick<ModalProps, 'style'>;

const ModalContainer = styled(Content).attrs(
  ({ style }: StyledContentProps) => {
    const className = 'bg-ui-50';
    const currentStyle: CSSProperties = style || {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -90%)',
      boxShadow:'0px 24px 32px rgba(31, 41, 51, 0.04), 0px 16px 24px rgba(31, 41, 51, 0.04), 0px 4px 8px rgba(31, 41, 51, 0.04), 0px 0px 1px rgba(31, 41, 51, 0.04)',
      borderRadius: 12,
      width: '90vw',
      maxWidth: '437px',
      maxHeight: '85vh',
      outline: 'none',
      padding: '0px 24px 0px 24px',
      overflow: 'auto',
    };

    return {style: currentStyle,className};
  }
)<StyledContentProps>``;

const ModalTitle = styled(Title).attrs({
  className: 'text-lg font-semibold py-2',
})``;

const ModalHeader = styled.div.attrs({
  className:'flex justify-between pb-1.5',
})``;

const ModalClose = styled(Close).attrs({
  className: 'text-ui-500',
})``;
