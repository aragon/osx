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

export const Disabled = Template.bind({});
Disabled.args = {
  title: 'Action List Item',
  subtitle: 'Action List Item Subtitle',
  disabled: true,
};

export const Wide = Template.bind({});
Wide.args = {
  title: 'Action List Item',
  subtitle: 'Action List Item Subtitle',
  wide: true,
};
