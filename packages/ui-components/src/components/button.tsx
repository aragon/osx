import React, {ButtonHTMLAttributes} from 'react';
import styled from 'styled-components';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
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
export const Button: React.FC<ButtonProps> = ({
  size = 'medium',
  label,
  primary = false,
  backgroundColor,
  ...props
}) => {
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
    const className: string = `font-bold cursor-pointer leading-none inline-block ${
      primary ? 'text-white bg-blue-500' : 'text-gray-800 bg-transparent shadow'
    }`;

    const style: any = {
      ...(size ? variantSizeStyles[size] : variantSizeStyles.default),
      backgroundColor,
    };

    return {className, style};
  }
)<StyledButtonProps>`
  border-radius: 3em;
`;
