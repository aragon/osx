import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';

import {ListItemDao} from '../src';

const DefaultProps = {daoName: 'abc', daoAddress: 'abc.dao.eth'};

describe('ListItemDao', () => {
  // eslint-disable-next-line
  function setup(args?: any) {
    render(<ListItemDao {...DefaultProps} {...args} />);
    return screen.getByRole('button');
  }

  test('should render without crashing', () => {
    const element = setup();
    expect(element).toBeVisible;
  });

  test('should call the onItemSelected method when clicked', () => {
    const mockHandler = jest.fn();
    const value = 'def';
    const element = setup({onClick: mockHandler, value});

    fireEvent.click(element);

    expect(mockHandler).toHaveBeenCalledTimes(1);
  });
});
