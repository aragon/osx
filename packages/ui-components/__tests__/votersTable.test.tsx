import React from 'react';
import {render, screen} from '@testing-library/react';

import {VotersTable} from '../src';

const voters = [
  {
    wallet: 'DAO XYZ',
    option: 'Yes',
    votingPower: '40%',
    tokenAmount: '1,000TN',
  },
];

describe('VotersTable', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<VotersTable voters={voters} {...args} />);
    return screen.getByTestId('votersTable');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
