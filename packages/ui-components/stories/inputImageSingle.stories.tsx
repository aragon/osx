import React from 'react';
import {Meta, Story} from '@storybook/react';
import {InputImageSingle, InputImageSingleProps} from '../src';

export default {
  title: 'Components/Input/Image/Single',
  component: InputImageSingle,
} as Meta;

const Template: Story<InputImageSingleProps> = args => (
  <InputImageSingle {...args} />
);

export const Single = Template.bind({});
Single.args = {
  onChange: () => null,
  maxDimension: 2400,
  minDimension: 256,
  maxFileSize: 3000000,
  onlySquare: true,
  onError: () =>
    alert(
      'Please provide a squared image (PNG, SVG, JPG or GIF) with a maximum of 3MB and size between 256px and 2400 px on each side'
    ),
};
