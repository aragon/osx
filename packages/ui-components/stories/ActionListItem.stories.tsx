import React from 'react';
import {Meta, Story} from '@storybook/react';
import {ActionListItem, ActionListItemProps} from '../src';

export default {
  title: 'Components/ActionListItem',
  component: ActionListItem,
} as Meta;

const Template: Story<ActionListItemProps> = args => (
  <ActionListItem {...args} />
);

export const Default = Template.bind({});
Default.args = {
  title: 'Action List Item',
  subtitle: 'Action List Item Subtitle',
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
