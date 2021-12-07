import React from 'react';
import {render, screen} from '@testing-library/react';

import {RadioGroup, Radio} from '../src';

describe('Radio Group', () => {
  function setup(args: any) {
    render(
      <RadioGroup defaultValue="USD" {...args}>
        <Radio value="USD">USD</Radio>
        <Radio value="ETH">ETH</Radio>
      </RadioGroup>
    );
    return screen.getByTestId('radioGroup');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
