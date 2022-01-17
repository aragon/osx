import React from 'react';
import {Meta, Story} from '@storybook/react';
import {CardProposal, CardProposalProps} from '../src';

export default {
  title: 'Components/Cards/Proposal',
  component: CardProposal,
} as Meta;

const Template: Story<CardProposalProps> = args => <CardProposal {...args} />;

export const Default = Template.bind({});
Default.args = {
  state: 'pending',
  title: 'Title',
  description: 'Description',
  voteTitle: 'Winning Option',
  voteProgress: 70,
  voteLabel: 'Yes',
  tokenAmount: '3.5M',
  tokenSymbol: 'DNT',
  publishLabel: 'Published by',
  publisherAddress: '0x374d444487A4602750CA00EFdaC5d22B21F130E1',
  buttonLabel: ['Read Proposal', 'Vote now', 'Execute Now', 'Edit Proposal'],
  AlertMessage: ['Starts in x days y hours', 'x days y hours left'],
  StatusLabel: [
    'Draft',
    'Pending',
    'Active',
    'Executed',
    'Succeeded',
    'Defeated',
  ],
  onClick: () => {
    alert('Pressing this button would allow to change DAO.');
  },
};
