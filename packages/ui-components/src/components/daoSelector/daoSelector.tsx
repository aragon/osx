import React from 'react';
import styled from 'styled-components';

import {Avatar} from '../avatar';
import {IconSwitch} from '../icons';
import {ButtonIcon} from '../button';

export type DaoSelectorProps = {
  src: string;
  label: string;
  onClick: () => void;
  /**
   * This applies the active style to the component, even when the component is not
   * currently active. This can be used when the component acts as the trigger
   * for a popover, for example. During the time the popover is open, this
   * component is considered selected.
   */
  isSelected: boolean;
};

export const DaoSelector = ({
  src,
  label,
  onClick,
  isSelected,
}: DaoSelectorProps) => {
  return (
    <StyledButton
      data-testid="daoSelector"
      onClick={onClick}
      isSelected={isSelected}
    >
      <Avatar src={src} size={'large'} mode="square" />
      <p>{label}</p>
      <ButtonIcon
        icon={<HoverIconSwitch />}
        mode="ghost"
        size="small"
        bgWhite
      />
    </StyledButton>
  );
};

type StyledButtonProps = {
  isSelected: DaoSelectorProps['isSelected'];
};

// TODO: Switch font from bold to the appropriate weight (700)
const StyledButton = styled.button.attrs(({isSelected}: StyledButtonProps) => {
  const dimensions = 'flex flex-col items-center rounded-2xl font-bold';
  const baseStyle = 'text-ui-800 font-bold text-sm';
  const dimensionsDesktop =
    'desktop:flex desktop:flex-row desktop:items-center desktop:space-x-2 desktop:text-base desktop:pr-1.5';
  const hoverDesktop = 'group ';
  const focusStyle = 'focus:outline-none focus:ring-2 focus:ring-primary-500';
  const activeStyle = 'active:text-primary-500';
  const selectedStyle = 'desktop:bg-ui-0 desktop:text-primary-600';

  const combinedClasses = `${dimensions} ${baseStyle} ${dimensionsDesktop} ${hoverDesktop} ${focusStyle} ${activeStyle} ${
    isSelected ? selectedStyle : ''
  }`;
  return {className: combinedClasses};
})<StyledButtonProps>``;

const HoverIconSwitch = styled(IconSwitch).attrs(() => {
  return {
    className: 'hidden desktop:block group-hover:text-primary-500',
  };
})``;
