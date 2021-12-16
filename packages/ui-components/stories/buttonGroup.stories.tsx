import React from 'react';
import {Meta, Story} from '@storybook/react';
import {Radio, RadioGroup, RadioGroupProps} from '../src';

export default {
  title: 'Components/Buttons/Group',
  component: RadioGroup,
} as Meta;

const Template: Story<RadioGroupProps> = args => (
  <RadioGroup {...args}>
    <Radio value="1D">1D</Radio>
    <Radio value="1W">1W</Radio>
    <Radio value="1M">1M</Radio>
    <Radio value="1Y">1Y</Radio>
    <Radio value="Max">Max</Radio>
  </RadioGroup>
);

export const Default = Template.bind({});
Default.args = {
  defaultValue: 'Max',
  onChange: value => console.log(value),
};
