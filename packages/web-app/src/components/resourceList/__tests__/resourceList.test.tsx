import React from 'react';
import {render, screen} from 'test-utils';

import ResourceList from '..';

const links = [
  {href: 'https://client.aragon.org/', label: 'Client'},
  {href: 'https://govern.aragon.org/', label: 'Govern'},
];

describe('ResourceList', () => {
  test('should render', () => {
    render(<ResourceList links={links} />);

    const element = screen.getByTestId(/resourceList/i);
    expect(element).toBeInTheDocument();
  });

  test('should display all the links passed in', () => {
    render(<ResourceList links={links} />);

    const elements = screen.getAllByTestId(/listItem-link/i);
    expect(elements.length).toBe(links.length);
  });
});
