import {
  ActionListItem,
  ActionListItemProps,
  IconChevronRight,
  IconTurnOff,
} from '../src';
import React from 'react';
import {Meta, Story} from '@storybook/react';

export default {
  title: 'Components/ActionListItem',
  component: ActionListItem,
} as Meta;

const Template: Story<ActionListItemProps> = args => (
  <ActionListItem {...args} />
);

export const Default = Template.bind({});
Default.args = {
  title: 'Action List Item',
  subtitle: 'Action List Item Subtitle',
  icon: <IconChevronRight />,
};

export const TitleOnly = Template.bind({});
TitleOnly.args = {
  title: 'Action List Item',
  icon: <IconTurnOff />,
  wide: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
  title: 'Action List Item',
  subtitle: 'Action List Item Subtitle',
  disabled: true,
  icon: <IconChevronRight />,
};

export const Wide = Template.bind({});
Wide.args = {
  title: 'Action List Item',
  subtitle: 'Action List Item Subtitle',
  wide: true,
  icon: <IconChevronRight />,
};
