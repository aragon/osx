import React from 'react';
import { Meta, Story } from '@storybook/react';
import { Badge, BadgeProps } from '../src';

export default {
  title: 'Components/Badge',
  component: Badge,
} as Meta;

const Template: Story<BadgeProps> = args => <Badge {...args} />;

export const Default = Template.bind({});
Default.args = {
  label: '0.07%',
  colorScheme: 'neutral',
};
