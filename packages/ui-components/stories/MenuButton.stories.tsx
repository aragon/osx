import React from 'react';
import {Meta, Story} from '@storybook/react';
import {MenuButton, MenuButtonProps} from '../src';

export default {
  title: 'Components/Buttons/Menu',
  component: MenuButton,
} as Meta;

const Template: Story<MenuButtonProps> = args => <MenuButton {...args} />;

export const AllProps = Template.bind({});
AllProps.args = {
  label: 'Menu Button',
  onClick: () => {
    alert('hey, you just triggered the onClick method :)');
  },
};
