import React from 'react';
import {Meta, Story} from '@storybook/react';
import {TimeInput, TimeInputProps} from '../src';

export default {
  title: 'Components/Input/Time',
  component: TimeInput,
} as Meta;

const Template: Story<TimeInputProps> = args => <TimeInput {...args} />;

export const Time = Template.bind({});
Time.args = {
  mode: 'default',
};
