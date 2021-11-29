import React from 'react';
import { Meta, Story } from '@storybook/react';
import { Input, InputProps } from '../src';

export default {
  title: 'Components/Input',
  component: Input,
} as Meta;

const Template: Story<InputProps> = args => <Input {...args} />;

export const Simple = Template.bind({});
Simple.args = {
  mode: 'default',
  placeholder:'Placeholder'
};
