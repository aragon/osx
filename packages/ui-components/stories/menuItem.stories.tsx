import React from 'react';
import {Meta, Story} from '@storybook/react';

import {MenuItem, MenuItemProps, IconCommunity} from '../src';

export default {
  title: 'Components/MenuItem',
  component: MenuItem,
} as Meta;

const Template: Story<MenuItemProps> = args => <MenuItem {...args} />;

export const Default = Template.bind({});
Default.args = {
  label: 'Menu Item',
  icon: <IconCommunity />,
};

export const Active = Template.bind({});
Active.args = {
  isSelected: true,
  label: 'Menu Item',
  icon: <IconCommunity />,
};
