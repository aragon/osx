import React from 'react';
import {render, screen} from '@testing-library/react';

import {WidgetStatus} from '../src';

describe('WidgetStatus', () => {
  // eslint-disable-next-line
  function setup(args: any) {
    render(<WidgetStatus {...args} />);
    return screen.getByTestId('widgetStatus');
  }

  test('should render without crashing', () => {
    const element = setup({});
    expect(element).toBeInTheDocument;
  });
});
