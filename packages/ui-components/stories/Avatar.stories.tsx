import React from 'react';
import {Meta, Story} from '@storybook/react';
import {Avatar, AvatarProps} from '../src';

export default {
  title: 'Components/Avatar',
  component: Avatar,
} as Meta;

const Template: Story<AvatarProps> = args => <Avatar {...args} />;

export const Square = Template.bind({});
Square.args = {
  src:
    'https://banner2.cleanpng.com/20180325/sxw/kisspng-computer-icons-avatar-avatar-5ab7529a8e4e14.9936310115219636745829.jpg',
  mode: 'square',
};

export const Circle = Template.bind({});
Circle.args = {
  src:
    'https://banner2.cleanpng.com/20180325/sxw/kisspng-computer-icons-avatar-avatar-5ab7529a8e4e14.9936310115219636745829.jpg',
  mode: 'circle',
};

export const Initials = Template.bind({});
Initials.args = {
  src:
    'https://eu.ui-avatars.com/api/?name=Dao+Name+three&background=0037D2&color=fff',
  mode: 'circle',
};
