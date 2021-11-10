import React from 'react';
import {Meta, Story} from '@storybook/react';
import {SimpleButton, ButtonProps} from '../src';

export default {
  title: 'Components/Buttons/Simple',
  component: SimpleButton,
} as Meta;

const Template: Story<ButtonProps> = args => <SimpleButton {...args} />;

export const AllProps = Template.bind({});
AllProps.args = {
  label: 'Button Text',
  disabled: false,
  onClick: () => {
    alert('hey, you just triggered the onClick method :)');
  },
};
