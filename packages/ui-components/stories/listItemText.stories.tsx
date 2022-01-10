import React from 'react';
import {Meta, Story} from '@storybook/react';

import {ListItemText, ListItemTextProps} from '../src/components/listItem';
import {IconAdd, IconChevronRight} from '../src';

export default {
  title: 'Components/ListItem/Text',
  component: ListItemText,
} as Meta;

const Template: Story<ListItemTextProps> = args => <ListItemText {...args} />;

export const TwoIcons = Template.bind({});
TwoIcons.args = {
  mode: 'default',
  title: 'My Title',
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
