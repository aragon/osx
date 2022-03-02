import React from 'react';
import {Meta, Story} from '@storybook/react';
import {CardDao, CardDaoProps} from '../src';

export default {
  title: 'Components/Cards/Dao',
  component: CardDao,
} as Meta;

const Template: Story<CardDaoProps> = args => <CardDao {...args} />;

export const Default = Template.bind({});
Default.args = {
  daoName: 'DaoName',
  daoAddress: '0x6720000000000000000000000000000000007739',
  src: '',
  onClick: () => {
    alert('Pressing this button would allow to change DAO.');
  },
};
