import React from 'react';
import {Meta, Story} from '@storybook/react';
import {Button, ButtonProps} from '../src';

export default {
  title: 'Components/Button',
  component: Button,
} as Meta;

const Template: Story<ButtonProps> = args => <Button {...args} />;

export const AllProps = Template.bind({});
AllProps.args = {
  label: 'Button Text',
  disabled: false,
  onClick: () => {
    console.log('hi');
  },
};
