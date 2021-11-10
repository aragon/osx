import React from 'react';
import {Meta, Story} from '@storybook/react';
import {AddButton, ButtonProps} from '../src';

export default {
  title: 'Components/Buttons/Add',
  component: AddButton,
} as Meta;

const Template: Story<ButtonProps> = args => <AddButton {...args} />;

export const AllProps = Template.bind({});
AllProps.args = {
  label: 'Add Button',
  onClick: () => {
    alert('hey, you just triggered the onClick method :)');
  },
};
