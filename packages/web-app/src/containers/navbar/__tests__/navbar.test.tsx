import React from 'react';
import {render, screen} from 'test-utils';
import {GlobalModalsProvider} from 'context/globalModals';

import Navbar from '..';

describe('Navbar', () => {
  test('should render', () => {
    render(
      <GlobalModalsProvider>
        <Navbar />
      </GlobalModalsProvider>
    );

    const element = screen.getByTestId('navbar');
    expect(element).toBeInTheDocument();
  });
});
