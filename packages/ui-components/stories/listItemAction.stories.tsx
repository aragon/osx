import React from 'react';
import {Meta, Story} from '@storybook/react';

import {ListItemAction, ListItemActionProps} from '../src/components/listItem';
import {IconAdd, IconChevronRight} from '../src';

export default {
  title: 'Components/ListItem/Action',
  component: ListItemAction,
} as Meta;

const Template: Story<ListItemActionProps> = args => (
  <ListItemAction {...args} />
);

export const TwoIcons = Template.bind({});
TwoIcons.args = {
  mode: 'default',
  title: 'My Title',
  bgWhite: false,
  subtitle: 'My subtitle',
  iconLeft: <IconAdd />,
  iconRight: <IconChevronRight />,
};
export const Left = Template.bind({});
Left.args = {
  mode: 'default',
  title: 'My Title',
  subtitle: 'My subtitle',
  iconLeft: <IconAdd />,
};
export const Right = Template.bind({});
Right.args = {
  mode: 'default',
  title: 'My Title',
  subtitle: 'My subtitle',
  iconRight: <IconChevronRight />,
};
