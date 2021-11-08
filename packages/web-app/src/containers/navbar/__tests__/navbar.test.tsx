import React from 'react';
import {render, screen} from '@testing-library/react';
import {HashRouter as Router} from 'react-router-dom';

import Navbar from '..';

// TODO: extract to test utils to be reusable; rendering with router as well
jest.mock('react-i18next', () => ({
  useTranslation: () => {
    return {
      t: (str: string) => str,
      i18n: {changeLanguage: () => new Promise(() => {})},
    };
  },
}));

describe('Navbar', () => {
  test('should render', () => {
    render(
      <Router>
        <Navbar />
      </Router>
    );

    const element = screen.getByTestId(/nav/i);
    expect(element).toBeInTheDocument();
  });
});
