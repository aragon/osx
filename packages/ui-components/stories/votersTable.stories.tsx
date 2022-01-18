import React from 'react';
import {Meta, Story} from '@storybook/react';
import {VotersTable, VotersTableProps} from '../src';

export default {
  title: 'Components/Table/Voters',
  component: VotersTable,
} as Meta;

const Template: Story<VotersTableProps> = args => <VotersTable {...args} />;

export const Default = Template.bind({});
Default.args = {
  voters: [
    {
      wallet: 'DAO XYZ',
      option: 'Yes',
      votingPower: '40%',
      tokenAmount: '1,000TN',
    },
    {
      wallet: 'punk5768.eth',
      option: 'No',
      votingPower: '10%',
      tokenAmount: '200',
    },
    {
      wallet: '0xc54c...ee7a',
      option: 'Yes',
      votingPower: '13.333%',
      tokenAmount: '250TN',
    },
  ],
  onLoadMore: () => alert('load more clicked'),
};
