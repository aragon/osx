import React from 'react';
import {Meta, Story} from '@storybook/react';
import {CheckboxListItem, CheckboxListItemProps} from '../src';

export default {
  title: 'Components/Checkbox/ListItem',
  component: CheckboxListItem,
} as Meta;

const Template: Story<CheckboxListItemProps> = args => (
  <CheckboxListItem {...args} />
);

export const Default = Template.bind({});
Default.args = {
  label: 'Label',
  helptext: 'Helptext',
  multiSelect: true,
  disabled: false,
  state: 'default',
  onClick: console.log,
};
