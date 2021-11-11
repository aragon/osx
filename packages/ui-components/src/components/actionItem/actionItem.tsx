import React from 'react';
import styled from 'styled-components';

import {IconButton} from '../../../src';

export type ActionItemProps = {
  label: string;
  icon: string;
};

// TODO: Test
// TODO: configure boxshadow for focus
export const ActionItem: React.FC<ActionItemProps> = ({
  icon,
  label,
  ...props
}) => {
  return (
    <StyledIconB
      mode="ghost"
      //  'text-primary-500 bg-ui-0 hover:text-primary-800 active:bg-primary-50';
      iconSrc={icon}
      label={label}
      // TODO:  Check iconbutton api
      size="default"
      side="left"
      {...props}
    />
  );
};

const StyledIconB = styled(IconButton).attrs(({className}) => {
  console.log(className);
})``;

const StyledIconButton = styled(IconButton).attrs({
  className:
    'font-semibold text-base text-ui-600 hover:text-primary-500 disabled:text-ui-300',
})``;
