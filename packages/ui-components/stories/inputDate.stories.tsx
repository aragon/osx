import React from 'react';
import {Meta, Story} from '@storybook/react';
import {DateInput, DateInputProps} from '../src';

export default {
  title: 'Components/Input/Date',
  component: DateInput,
} as Meta;

const Template: Story<DateInputProps> = args => <DateInput {...args} />;

export const Date = Template.bind({});
Date.args = {
  disabled: false,
  value: '2022-04-20',
};
