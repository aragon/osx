import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';

import {Dao as ListItemDao} from '../stories/listItemDao.stories';

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

  test('should call the onItemSelected method with the item value when clicked', () => {
    const mockHandler = jest.fn();
    const value = 'def';
    const element = setup({onItemSelect: mockHandler, value});

    fireEvent.click(element);

    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledWith(value);
  });

  test('should call the onItemSelected method with the daoName when clicked and value not given', () => {
    const mockHandler = jest.fn();
    const element = setup({onItemSelect: mockHandler});

    fireEvent.click(element);

    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledWith(DefaultProps.daoName);
  });
});
