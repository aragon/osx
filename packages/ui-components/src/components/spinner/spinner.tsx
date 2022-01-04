import React, {HTMLAttributes} from 'react';
import styled from 'styled-components';

export type SpinnerProps = HTMLAttributes<HTMLElement> & {
  /**
   * The preferred Size of the spinner
   */
  size: 'small' | 'default' | 'big';
  /**
   * Styles
   */
  color?: string;
};

/**
 * Spinner UI component
 */
export const Spinner: React.FC<SpinnerProps> = ({size = 'small', color}) => {
  return (
    <StyledSpinner data-testid="spinner" {...{size, color}}></StyledSpinner>
  );
};

type SizesType = Record<SpinnerProps['size'], string>;

const StyledSpinner = styled.div.attrs(({size}: SpinnerProps) => {
  const sizes: SizesType = {
    small: 'w-3 h-3',
    default: 'w-5 h-5',
    big: 'w-6 h-6',
  };
  const className = `rounded-full 
        ease-linear border-2
        border-t-2 border-ui-0
        ${sizes[size]}
    `;

  return {className};
})<SpinnerProps>`
  border-top-color: ${({color}) => color || '#003bf5'};
  -webkit-animation: spinner 1s linear infinite;
  animation: spinner 1s linear infinite;
  @-webkit-keyframes spinner {
    0% {
      -webkit-transform: rotate(0deg);
    }
    100% {
      -webkit-transform: rotate(360deg);
    }
  }
  @keyframes spinner {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;
