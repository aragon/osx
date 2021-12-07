import {TransferListItem, TransferListItemProps} from '../src';
import React from 'react';
import {Meta, Story} from '@storybook/react';

export default {
  title: 'Components/TransferListItem',
  component: TransferListItem,
} as Meta;

const Template: Story<TransferListItemProps> = args => (
  <TransferListItem {...args} />
);

export const Pending = Template.bind({});
Pending.args = {
  isPending: true,
  title: 'Deposit',
  tokenAmount: 300,
  tokenSymbol: 'DAI',
  transferDate: 'Pending...',
  transferType: 'Deposit',
  usdValue: '$200.00',
};

export const Deposit = Template.bind({});
Deposit.args = {
  title: 'Deposit DAI so I can do whatever I want whenever I want',
  tokenAmount: 300,
  transferDate: 'Yesterday',
  tokenSymbol: 'DAI',
  transferType: 'Deposit',
  usdValue: '$200.00',
};

export const Withdraw = Template.bind({});
Withdraw.args = {
  title: 'Withdraw',
  tokenAmount: 300,
  tokenSymbol: 'DAI',
  transferDate: 'Yesterday',
  transferType: 'Withdraw',
  usdValue: '$200.00',
};
