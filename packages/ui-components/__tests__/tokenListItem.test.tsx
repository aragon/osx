import React from 'react';
import {render, screen} from '@testing-library/react';

import {Default as TokenListItem} from '../stories/TokenListItem.stories';

describe('TokenListITem', () => {
  function setup(args?: any) {
    render(<TokenListItem {...args} />);
    return screen.getByTestId('tokenListItem');
  }

  test('should render without crashing', () => {
    const element = setup();
    expect(element).toBeVisible;
  });
});
