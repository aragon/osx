import React, {ButtonHTMLAttributes} from 'react';
import styled from 'styled-components';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  mode: 'primary' | 'secondary' | 'tertiary' | 'ghost';
  size: 'small' | 'default';
  functionality: 'add' | 'open' | 'normal';
  label: string;
}

/**
 * Primary UI component for user interaction
 */
export const Button: React.FC<ButtonProps> = ({
  mode = 'tertiary',
  size = 'default',
  functionality = 'normal',
  label,
  onClick,
}) => {
  switch (mode) {
    case 'primary':
      return (
        <PrimaryButton onClick={onClick} size={size}>
          {label}
        </PrimaryButton>
      );
    case 'secondary':
      return (
        <SecondaryButton onClick={onClick} size={size}>
          {label}
        </SecondaryButton>
      );
    case 'tertiary':
      return (
        <TertiaryButton onClick={onClick} size={size}>
          {label}
        </TertiaryButton>
      );
    case 'ghost':
      return <GhostButton size={size}>{label}</GhostButton>;
  }
};

export interface SizedButtonProps {
  size: ButtonProps['size'];
}

const SizedButton = styled.button.attrs(({size}: SizedButtonProps) => {
  let className = 'px-2';
  switch (size) {
    case 'small':
      className += ' py-1 rounded-xl';
      break;
    default:
      className += ' py-1.5 rounded-2xl';
      break;
  }
  return {className};
})<SizedButtonProps>``;

const PrimaryButton = styled(SizedButton).attrs({
  className:
    'text-ui-0 bg-primary-400 hover:bg-primary-500 active:bg-primary-700 disabled:',
})<SizedButtonProps>``;

const SecondaryButton = styled(SizedButton).attrs({
  className:
    'text-primary-500 bg-primary-100 hover:text-primary-800 active:bg-primary-200 active:text-primary-800',
})<SizedButtonProps>``;

const TertiaryButton = styled(SizedButton).attrs({
  className:
    'text-ui-600 bg-ui-0 border-2 border-ui-100 hover:border-ui-300 active:border-ui-800',
})<SizedButtonProps>``;

const GhostButton = styled(SizedButton).attrs({
  className:
    'text-primary-500 bg-ui-0 hover:text-primary-800 active:bg-primary-50',
})<SizedButtonProps>``;
