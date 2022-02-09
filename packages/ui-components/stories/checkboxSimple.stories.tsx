import React from 'react';
import {Meta, Story} from '@storybook/react';
import {CheckboxSimple, CheckboxSimpleProps} from '../src';

export default {
  title: 'Components/Checkbox/Simple',
  component: CheckboxSimple,
} as Meta;

const Template: Story<CheckboxSimpleProps> = args => (
  <CheckboxSimple {...args} />
);

export const Default = Template.bind({});
Default.args = {
  label: 'Label',
  iconLeft: true,
  multiSelect: true,
  disabled: false,
  state: 'default',
  onClick: () => alert('checkbox clicked'),
};
