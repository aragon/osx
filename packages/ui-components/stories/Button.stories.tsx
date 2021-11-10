import React from 'react';
import {Meta, Story} from '@storybook/react';
import {IconButton, IconButtonProps} from '../src';

export default {
  title: 'Components/Button',
  component: IconButton,
} as Meta;

const Template: Story<IconButtonProps> = args => <IconButton {...args} />;

export const AllProps = Template.bind({});
AllProps.args = {
  label: 'Button Text',
  disabled: false,
  onClick: () => {
    console.log('hi');
  },
  side: 'left',
  iconSrc: 'https://place-hold.it/150x150',
};
