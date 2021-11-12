import React from 'react';
import {Meta, Story} from '@storybook/react';
import {ActionItem, ActionItemProps} from '../src';

export default {
  title: 'Components/ActionItem',
  component: ActionItem,
} as Meta;

const Template: Story<ActionItemProps> = args => <ActionItem {...args} />;

export const Default = Template.bind({});
Default.args = {
  label: 'Action Item',
  icon: 'X',
};

export const ToggleIcon = Template.bind({});
ToggleIcon.args = {
  label: 'Icon shown only on active state',
  icon: ':)',
  toggleIcon: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
  disabled: true,
  label: 'Disabled ActionItem',
  icon: 'X',
};
