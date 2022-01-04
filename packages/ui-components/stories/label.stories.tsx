import React from 'react';
import {Meta, Story} from '@storybook/react';
import {Label, LabelProps} from '../src';

export default {
  title: 'Components/Label',
  component: Label,
} as Meta;

const Template: Story<LabelProps> = args => <Label {...args} />;

export const Default = Template.bind({});
Default.args = {
  label: 'Label',
  helpText: 'HelpText',
  isOptional: false,
};
