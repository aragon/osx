import React from 'react';
import {Meta, Story} from '@storybook/react';

import {TextareaSimple, TextareaSimpleProps} from '../src';

export default {
  title: 'Components/TextArea/Simple',
  component: TextareaSimple,
} as Meta;

const Template: Story<TextareaSimpleProps> = args => (
  <TextareaSimple {...args} />
);

export const Simple = Template.bind({});
Simple.args = {
  placeholder: 'Placeholder',
  disabled: false,
};
