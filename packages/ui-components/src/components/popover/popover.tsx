import React, {HTMLAttributes, ReactNode, CSSProperties} from 'react';
import styled from 'styled-components';
import {Root, Trigger, Content} from '@radix-ui/react-popover';

export interface PopoverProps extends HTMLAttributes<HTMLElement> {
  /**
   * The open state of the popover when it is initially rendered.
   */
  defaultOpen?: boolean;
  /**
   * The controlled open state of the popover. Must be used in conjunction with onOpenChange.
   */
  open?: boolean;
  /**
   * Event handler called when the open state of the popover changes.
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * The preferred side of the anchor to render against when open
   */
  side: 'top' | 'right' | 'bottom' | 'left';
  /**
   * The preferred alignment against the anchor. May change when collisions occur.
   */
  align: 'start' | 'center' | 'end';
  /**
   * Trigger
   */
  children: ReactNode;
  /**
   * Content
   */
  content: ReactNode;
  /**
   * Content Width
   */
  width: number | string;
}

/**
 * Default UI component
 */
export const Popover: React.FC<PopoverProps> = ({
  children,
  content,
  defaultOpen,
  open,
  onOpenChange,
  side = 'bottom',
  align = 'center',
  ...props
}) => {
  return (
    <Root {...{defaultOpen, open, onOpenChange}}>
      <Trigger data-testid="popover-trigger">{children}</Trigger>
      <StyledContent
        data-testid="popover-content"
        {...props}
        align={align}
        side={side}
      >
        {content}
      </StyledContent>
    </Root>
  );
};

const contentMargins = {
  top: 'margin-bottom: 8px',
  bottom: 'margin-top: 8px',
  left: 'margin-right: 8px',
  right: 'margin-left: 8px',
};

type StyledContentProps = {
  width: number | string;
  style?: CSSProperties | undefined;
};

const StyledContent = styled(Content).attrs(
  ({width = 300, style}: StyledContentProps) => {
    const currentStyle: CSSProperties = style || {
      width,
      background: '#FFFFFF',
      boxShadow: '0px 0px 4px rgba(50, 63, 75, 0.16)',
      borderRadius: 12,
    };

    return {style: currentStyle};
  }
)<StyledContentProps>`
  ${({side}) => side && contentMargins[side]}
`;
