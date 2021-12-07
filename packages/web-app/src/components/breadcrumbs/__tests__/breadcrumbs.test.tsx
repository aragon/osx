import React from 'react';
import {BreadcrumbData} from 'use-react-router-breadcrumbs';
import {render, screen} from 'test-utils';

import Breadcrumbs from '..';

const DEFAULT_CRUMBS = [
  {match: {pathname: '/'}, key: '123', breadcrumb: <button>first</button>},
  {match: {pathname: '/dex'}, key: '456', breadcrumb: <button>last</button>},
];

const setup = () => {
  render(<Breadcrumbs breadcrumbs={DEFAULT_CRUMBS as BreadcrumbData[]} />);
  return {
    container: screen.getByTestId('breadcrumbs'),
    crumbs: screen.getAllByRole('link'),
  };
};

describe('Breadcrumbs', () => {
  test('should render without crashing', () => {
    const {container} = setup();
    expect(container).toBeInTheDocument();
  });

  test('should render the correct number of crumbs', () => {
    const {crumbs} = setup();
    expect(crumbs.length).toBe(DEFAULT_CRUMBS.length);
  });

  test('should not render separator after last crumb', () => {
    const {crumbs} = setup();
    const lastCrumb = crumbs[DEFAULT_CRUMBS.length - 1];
    expect(lastCrumb.nextSibling).not.toBeInTheDocument();
  });

  test('should link to the correct paths', () => {
    const {crumbs} = setup();

    // Hashtag must be added because Hashrouter is being used
    crumbs.forEach((crumb, index) => {
      expect(crumb).toHaveAttribute(
        'href',
        '#' + DEFAULT_CRUMBS[index].match.pathname
      );
    });
  });
});
