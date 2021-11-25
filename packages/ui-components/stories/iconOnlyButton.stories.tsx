import React from 'react';
import {Meta, Story} from '@storybook/react';
import {IconOnlyButton, IconOnlyButtonProps, IconCommunity} from '../src';

export default {
  title: 'Components/Buttons/Icon Only',
  component: IconOnlyButton,
} as Meta;

const Template: Story<IconOnlyButtonProps> = args => (
  <IconOnlyButton {...args} />
);

export const Default = Template.bind({});
Default.args = {
  icon: <IconCommunity />,
};

export const Active = Template.bind({});
Active.args = {
  icon: <IconCommunity />,
  isActive: true,
};
