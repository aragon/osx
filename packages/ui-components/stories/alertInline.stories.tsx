import React from 'react';
import {Meta, Story} from '@storybook/react';
import {AlertInline, AlertInlineProps} from '../src';

export default {
  title: 'Components/Alerts/Inline',
  component: AlertInline,
} as Meta;

const Template: Story<AlertInlineProps> = args => <AlertInline {...args} />;

export const Default = Template.bind({});
Default.args = {
  mode: 'critical',
  label: 'Message text',
};
