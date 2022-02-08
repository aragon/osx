import React from 'react';
import styled from 'styled-components';

import {ButtonBase} from './buttonBase';
import type {IconType} from '../icons';
import type {ButtonBaseProps} from './buttonBase';

export type ButtonIconProps = Omit<
  ButtonBaseProps,
  'label' | 'iconRight' | 'iconLeft' | 'iconOnly'
> & {
  bgWhite?: boolean;
  icon: React.FunctionComponentElement<IconType>;
  isActive?: boolean;
};

export const ButtonIcon: React.FC<ButtonIconProps> = ({
  bgWhite = false,
  icon,
  isActive = false,
  mode = 'primary',
  size = 'medium',
  ...props
}) => {
  return (
    <StyledButton
      {...props}
      iconLeft={icon}
      bgWhite={bgWhite}
      isActive={isActive}
      mode={mode}
      size={size}
      iconOnly={true}
    />
  );
};

const paddingStyles = {
  small: 'w-4 p-1',
  medium: 'w-5 p-1.5',
  large: 'w-6 p-2',
};

type StyledButtonProps = {
  bgWhite: boolean;
  isActive: boolean;
  mode: ButtonBaseProps['mode'];
  size: ButtonBaseProps['size'];
};

const StyledButton = styled(ButtonBase).attrs(
  ({bgWhite, isActive, mode, size = 'medium'}: StyledButtonProps) => {
    let className: string | undefined;

    switch (mode) {
      case 'secondary':
        className = `${
          bgWhite ? 'bg-ui-50 disabled:bg-ui-50' : 'bg-ui-0 disabled:bg-ui-100'
        } ${isActive ? 'text-ui-800 bg-ui-200' : 'text-ui-600'} ${
          paddingStyles[size]
        } hover:text-ui-800 hover:bg-ui-100 active:text-ui-800 active:bg-ui-200 disabled:text-ui-300`;
        break;

      case 'ghost':
        className = `${
          bgWhite
            ? `${isActive ? 'bg-primary-50' : 'bg-ui-0'} active:bg-primary-50`
            : `${isActive ? 'bg-ui-0' : 'bg-ui-50'} active:bg-ui-0`
        } ${isActive ? 'ext-primary-500' : 'text-ui-500'} ${
          paddingStyles[size]
        } focus:text-primary-400 hover:text-primary-500 active:text-primary-500 disabled:text-ui-300 disabled:bg-transparent`;
        break;

      default:
        className = `${isActive ? 'bg-primary-700' : 'bg-primary-400'} ${
          paddingStyles[size]
        } text-ui-0 hover:bg-primary-500 active:bg-primary-700 disabled:text-primary-300 disabled:bg-primary-100`;
        break;
    }

    return {className};
  }
)<StyledButtonProps>``;
