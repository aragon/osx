import React from 'react';
import {Meta, Story} from '@storybook/react';
import {LinearProgress} from '../src';

export default {
  title: 'Components/Progress/Linear',
  component: LinearProgress,
} as Meta;

const Template: Story = args => <LinearProgress {...args} />;

export const Default = Template.bind({});
Default.args = {
  max: 3,
  value: 2,
};
