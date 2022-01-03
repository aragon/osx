import React from 'react';
import {Meta, Story} from '@storybook/react';
import {DropdownInput, SearchInputProps} from '../src';

export default {
  title: 'Components/Input/Dropdown',
  component: DropdownInput,
} as Meta;

const Template: Story<SearchInputProps> = args => <DropdownInput {...args} />;

export const Dropdown = Template.bind({});
Dropdown.args = {
  mode: 'default',
  placeholder: 'Select item...',
  disabled: false
};
