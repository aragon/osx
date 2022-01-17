import React from 'react';
import {Meta, Story} from '@storybook/react';

import {ListItemLink, ListItemLinkProps} from '../src/components/listItem';

export default {
  title: 'Components/ListItem/Link',
  component: ListItemLink,
} as Meta;

const Template: Story<ListItemLinkProps> = args => <ListItemLink {...args} />;

export const Default = Template.bind({});
Default.args = {
  href: 'https://aragon.org/',
};

export const WithLabel = Template.bind({});
WithLabel.args = {
  href: 'https://aragon.org/',
  label: 'This massively long link label for no reason',
};
