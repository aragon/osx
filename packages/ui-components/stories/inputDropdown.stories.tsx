import React from 'react';
import {Meta, Story} from '@storybook/react';
import {DropdownInput, DropDownInputProps} from '../src';

export default {
  title: 'Components/Input/Dropdown',
  component: DropdownInput,
} as Meta;

const Template: Story<DropDownInputProps> = args => <DropdownInput {...args} />;

export const Dropdown = Template.bind({});
Dropdown.args = {
  mode: 'default',
  disabled: false,
};
