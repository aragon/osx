import React from 'react';
import {Meta, Story} from '@storybook/react';
import {MenuButton, MenuButtonProps} from '../src';

export default {
  title: 'Components/Buttons/Menu',
  component: MenuButton,
} as Meta;

const Template: Story<MenuButtonProps> = args => <MenuButton {...args} />;

export const Close = Template.bind({});
Close.args = {
  isMobile: false,
  isOpen: false,
  onClick: () => {
    alert('hey, you just triggered the onClick method :)');
  },
};

export const Open = Template.bind({});
Open.args = {
  isMobile: false,
  isOpen: true,
  onClick: () => {
    alert('hey, you just triggered the onClick method :)');
  },
};

export const Mobile = Template.bind({});
Mobile.args = {
  isMobile: true,
  onClick: () => {
    alert('hey, you just triggered the onClick method :)');
  },
};
