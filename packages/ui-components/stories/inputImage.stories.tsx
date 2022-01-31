import React from 'react';
import {Meta, Story} from '@storybook/react';
import {InputImage, InputImageProps} from '../src';

export default {
  title: 'Components/Input/Image',
  component: InputImage,
} as Meta;

const Template: Story<InputImageProps> = args => <InputImage {...args} />;

export const Image = Template.bind({});
Image.args = {
  onChange: () => null,
  onError: () =>
    alert(
      'Please provide a squared image (PNG, SVG, JPG or GIF) with maximum of 5MB and size between 256px and 2400 px on each side'
    ),
};
