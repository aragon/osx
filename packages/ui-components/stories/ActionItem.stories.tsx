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
  icon: 'sdf',
};
