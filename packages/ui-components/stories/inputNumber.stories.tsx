import React from 'react';
import {Meta, Story} from '@storybook/react';
import {NumberInput, NumberInputProps} from '../src';

export default {
  title: 'Components/Input/Number',
  component: NumberInput,
} as Meta;

const Template: Story<NumberInputProps> = args => <NumberInput {...args} />;

export const Number = Template.bind({});
Number.args = {
  mode: 'default',
  disabled: false,
};
