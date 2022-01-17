import React from 'react';
import {Meta, Story} from '@storybook/react';
import {Option, ButtonGroup, ButtonGroupProps} from '../src';

export default {
  title: 'Components/Buttons/Group',
  component: ButtonGroup,
} as Meta;

const Template: Story<ButtonGroupProps> = args => (
  <ButtonGroup {...args}>
    <Option value="1D" label="1D" />
    <Option value="1W" label="1W" />
    <Option value="1M" label="1M" />
    <Option value="1Y" label="1Y" />
    <Option value="Max" label="Max" />
  </ButtonGroup>
);

export const Default = Template.bind({});
Default.args = {
  bgWhite: true,
  defaultValue: 'Max',
  onChange: value => console.log(value),
  fullWidth: false,
};
