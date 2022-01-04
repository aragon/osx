import React from 'react';
import {Meta, Story} from '@storybook/react';
import {Spinner, SpinnerProps} from '../src';

export default {
  title: 'Components/Spinner',
  component: Spinner,
} as Meta;

const Template: Story<SpinnerProps> = args => <Spinner {...args} />;

export const Default = Template.bind({});
