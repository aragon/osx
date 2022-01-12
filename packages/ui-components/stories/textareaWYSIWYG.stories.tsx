import React from 'react';
import {Meta, Story} from '@storybook/react';

import {TextareaWYSIWYG, TextareaWYSIWYGProps} from '../src';

export default {
  title: 'Components/TextArea/WYSIWYG',
  component: TextareaWYSIWYG,
} as Meta;

const Template: Story<TextareaWYSIWYGProps> = args => (
  <TextareaWYSIWYG {...args} />
);

export const WYSIWYG = Template.bind({});
WYSIWYG.args = {
  placeholder: 'Write something...',
  disabled: false,
};
