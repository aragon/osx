import React from 'react';
import styled from 'styled-components';

export interface IButton {
  /**
   * Is this the principal call to action on the page?
   */
  primary?: boolean;
  /**
   * What background color to use
   */
  backgroundColor?: string;
  /**
   * How large should the button be?
   */
  size?: 'small' | 'medium' | 'large';
  /**
   * Button contents
   */
  label: string;
  /**
   * Optional click handler
   */
  onClick?: () => void;
}

/**
 * Primary UI component for user interaction
 */
export const Button = ({
  size = 'medium',
  label,
  primary = false,
  backgroundColor,
  ...props
}: IButton) => {
  return (
    <StyledButton
      size={size}
      primary={primary}
      backgroundColor={backgroundColor}
      {...props}
    >
      {label}
    </StyledButton>
  );
};

type StyledButtonProps = {
  backgroundColor?: string;
  primary: boolean;
  size: IButton['size'];
};

const StyledButton = styled.button.attrs(
  ({ primary, size, backgroundColor }: StyledButtonProps) => {
    const mode = primary
      ? 'text-white bg-blue-500'
      : 'text-gray-800 bg-transparent shadow';

    let styles;

    switch (size) {
      case 'small':
        styles = { fontSize: '12px', padding: '10px 16px' };
        break;
      case 'medium':
        styles = { fontSize: '14px', padding: '11px 20px' };
        break;
      case 'large':
        styles = { fontSize: '16px', padding: '12px 24px' };
        break;
      default:
        styles = { fontSize: '14px', padding: '11px 20px' };
        break;
    }

    return {
      className: `font-bold cursor-pointer leading-none inline-block ${mode}`,
      style: { ...styles, backgroundColor },
    };
  }
)<StyledButtonProps>`
  border-radius: 3em;
`;
