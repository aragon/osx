import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';

import {Breadcrumb} from '../src';

const crumbs = [
  {label: 'label-1', path: 'path-1'},
  {label: 'label-2', path: 'path-2'},
];

describe('Breadcrumb', () => {
  test('should render without crashing', () => {
    render(<Breadcrumb crumbs={crumbs} />);

    const element = screen.getByTestId(/breadcrumbs/i);
    expect(element).toBeInTheDocument;
  });

  test('should display the breadcrumbs with given labels', () => {
    render(<Breadcrumb crumbs={crumbs} />);
    const breadcrumbs = screen.getAllByRole('button');

    breadcrumbs.forEach((crumb, index) =>
      expect(crumb.textContent).toBe(crumbs[index].label)
    );
  });

  test('should call the onClick method with the correct path when breadcrumb is clicked', () => {
    const mockHandler = jest.fn();

    render(<Breadcrumb crumbs={crumbs} onClick={mockHandler} />);
    fireEvent.click(screen.getAllByRole('button')[0]);

    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(mockHandler).toBeCalledWith(crumbs[0].path);
  });

  test('should not call the onClick method when last breadcrumb is clicked', () => {
    const mockHandler = jest.fn();

    render(<Breadcrumb crumbs={crumbs} onClick={mockHandler} />);
    const breadcrumbs = screen.getAllByRole('button');
    fireEvent.click(breadcrumbs[breadcrumbs.length - 1]);

    expect(mockHandler).not.toHaveBeenCalled();
  });
});
