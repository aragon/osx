import React from 'react';
import {render, screen} from '@testing-library/react';

import {CardProposal} from '../src';

describe('cardProposal', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<CardProposal {...args} />);
    return screen.getByTestId('cardProposal');
  }

  test('should render without crashing', () => {
    const element = setup(properties);
    expect(element).toBeInTheDocument;
  });
});

const properties = {
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
  StateLabel: [
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
