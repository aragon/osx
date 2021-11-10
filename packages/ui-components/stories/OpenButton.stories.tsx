import React from 'react';
import {Meta, Story} from '@storybook/react';
import {OpenButton, ButtonProps} from '../src';

export default {
  title: 'Components/Buttons/Open',
  component: OpenButton,
} as Meta;

const Template: Story<ButtonProps> = args => <OpenButton {...args} />;

export const AllProps = Template.bind({});
AllProps.args = {
  label: 'Open Button',
  onClick: () => {
    alert('hey, you just triggered the onClick method :)');
  },
};
