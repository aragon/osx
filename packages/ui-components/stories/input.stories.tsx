import React from 'react';
import {Meta, Story} from '@storybook/react';
import {TextInput, TextInputProps} from '../src';

export default {
  title: 'Components/Input/Text',
  component: TextInput,
} as Meta;

const Template: Story<TextInputProps> = args => <TextInput {...args} />;

export const Text = Template.bind({});
Text.args = {
  mode: 'default',
  placeholder: 'Placeholder',
};
