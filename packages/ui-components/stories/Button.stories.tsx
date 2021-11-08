import React from 'react';
import {Meta, Story} from '@storybook/react';
import {Button, ButtonProps} from '../src';

export default {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    backgroundColor: {control: 'color'},
  },
} as Meta;

const Template: Story<ButtonProps> = args => <Button {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  label: 'Button Text',
  disabled: false,
  onClick: () => console.log('hi'),
  // mode: 'primary',
  // size: 'default',
  // functionality: 'default',
};
