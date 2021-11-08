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
   * The preferred popover position
   */
  position: {
    /**
     * The preferred side of the anchor to render against when open
     */
    side: 'top' | 'right' | 'bottom' | 'left';
    /**
     * The preferred alignment against the anchor. May change when collisions occur.
     */
    align: 'start' | 'center' | 'end';
  };
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
 * Primary UI component for user interaction
 */
export const Popover: React.FC<PopoverProps> = ({
  children,
  content,
  defaultOpen,
  open,
  onOpenChange,
  position = {side: 'bottom', align: 'center'},
  ...props
}) => {
  return (
    <Root {...{defaultOpen, open, onOpenChange}}>
      <Trigger data-testid="popover-trigger">{children}</Trigger>
      <StyledContent data-testid="popover-content" {...props} align={position.align} side={position.side}>
        {content}
      </StyledContent>
    </Root>
  );
};

type StyledContentProps = {
  width: number | string;
};

const StyledContent = styled(Content).attrs(
  ({width = 300}: StyledContentProps) => {
    const style: CSSProperties = {
      width,
      background: '#FFFFFF',
      boxShadow: '0px 0px 4px rgba(50, 63, 75, 0.16)',
      borderRadius: 12,
      padding: '20px 16px',
      margin: 8,
    };

    return {style};
  }
)<StyledContentProps>``;
