import React from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import {render, screen, fireEvent} from 'test-utils';

import AddLinks from '..';

const RenderWithForm: React.FC = ({children}) => {
  const methods = useForm();
  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('AddLinks', () => {
  test('should render', () => {
    render(
      <RenderWithForm>
        <AddLinks />
      </RenderWithForm>
    );

    const element = screen.getByTestId('add-links');
    expect(element).toBeInTheDocument();
  });

  test('should add row when button click', () => {
    render(
      <RenderWithForm>
        <AddLinks />
      </RenderWithForm>
    );

    const element = screen.getByText('Add Link');
    fireEvent.click(element);

    const rows = screen.getAllByTestId('link-row');
    expect(rows.length).toBe(1);
  });
});
