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
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
