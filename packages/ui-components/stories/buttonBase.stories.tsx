// TODO: remove story when publishing storybook
import React from 'react';
import {Meta, Story} from '@storybook/react';

import {IconAdd} from '../src';
import {ButtonBase, ButtonBaseProps} from '../src/components/button/buttonBase';

export default {
  title: 'Components/Buttons/Base',
  component: ButtonBase,
} as Meta;

const Template: Story<ButtonBaseProps> = args => <ButtonBase {...args} />;

export const ButtonText = Template.bind({});
ButtonText.args = {
  label: 'Button Text',
  disabled: false,
};

export const ButtonIcon = Template.bind({});
ButtonIcon.args = {
  label: 'Button Text',
  disabled: true,
  iconRight: <IconAdd />,
};
