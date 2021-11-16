import React from 'react';
import {Meta, Story} from '@storybook/react';

import {ActionItem, ActionItemProps, IconDashboard} from '../src';

export default {
  title: 'Components/ActionItem',
  component: ActionItem,
} as Meta;

const Template: Story<ActionItemProps> = args => <ActionItem {...args} />;

export const Default = Template.bind({});
Default.args = {
  label: 'Action Item',
  icon: <IconDashboard />,
};

export const Active = Template.bind({});
Active.args = {
  label: 'Action Item',
  icon: <IconDashboard />,
  isSelected: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
  disabled: true,
  label: 'Disabled ActionItem',
  icon: <IconDashboard />,
};

export const Wide = Template.bind({});
Wide.args = {
  label: 'Action Item',
  icon: <IconDashboard />,
  wide: true,
};
