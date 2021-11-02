import React from 'react';
import styled from 'styled-components';

export interface ButtonProps {
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
}: ButtonProps) => {
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
  size: ButtonProps['size'];
};

const variantSizeStyles = {
  small: {fontSize: '12px', padding: '10px 16px'},
  medium: {fontSize: '14px', padding: '11px 20px'},
  large: {fontSize: '16px', padding: '12px 24px'},
  default: {fontSize: '14px', padding: '11px 20px'},
};

const StyledButton = styled.button.attrs(
  ({primary, size, backgroundColor}: StyledButtonProps) => {
    const mode = primary
      ? 'text-white bg-blue-500'
      : 'text-gray-800 bg-transparent shadow';

    return {
      className: `font-bold cursor-pointer leading-none inline-block ${mode}`,
      style: {
        ...(size ? variantSizeStyles[size] : variantSizeStyles.default),
        backgroundColor,
      },
    };
  }
)<StyledButtonProps>`
  border-radius: 3em;
`;
