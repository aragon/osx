import React from 'react';
import {Meta, Story} from '@storybook/react';
import {DaoCard, DaoCardProps} from '../src';

export default {
  title: 'Components/DaoCard',
  component: DaoCard,
} as Meta;

const Template: Story<DaoCardProps> = args => <DaoCard {...args} />;

export const Default = Template.bind({});
Default.args = {
  daoName: 'DaoName',
  wide: false,
  daoAddress: '0x6720000000000000000000000000000000007739',
  src:
    'https://banner2.cleanpng.com/20180325/sxw/kisspng-computer-icons-avatar-avatar-5ab7529a8e4e14.9936310115219636745829.jpg',
  onClick: () => {
    alert('Pressing this button would allow to change DAO.');
  },
};
