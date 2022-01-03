import React from 'react';
import {Meta, Story} from '@storybook/react';
import {CardDao, CardDaoProps} from '../src';

export default {
  title: 'Components/Card/Dao',
  component: CardDao,
} as Meta;

const Template: Story<CardDaoProps> = args => <CardDao {...args} />;

export const Default = Template.bind({});
Default.args = {
  daoName: 'DaoName',
  wide: false,
  daoAddress: '0x6720000000000000000000000000000000007739',
  src: 'https://banner2.cleanpng.com/20180325/sxw/kisspng-computer-icons-avatar-avatar-5ab7529a8e4e14.9936310115219636745829.jpg',
  onClick: () => {
    alert('Pressing this button would allow to change DAO.');
  },
};

export const WithoutSwitch = Template.bind({});
WithoutSwitch.args = {
  daoName: 'DaoName',
  wide: true,
  includeSwitch: false,
  daoAddress: '0x6720000000000000000000000000000000007739',
  src: 'https://banner2.cleanpng.com/20180325/sxw/kisspng-computer-icons-avatar-avatar-5ab7529a8e4e14.9936310115219636745829.jpg',
  onClick: () => {
    alert('Pressing this button would allow to change DAO.');
  },
};
