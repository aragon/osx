import React from 'react';
import {Meta, Story} from '@storybook/react';
import {IconAdd} from '../src';

export default {
  title: 'Components/Icons',
  component: IconAdd,
} as Meta;

const Template: Story = args => <IconAdd {...args} />;

export const Interface = Template.bind({});
