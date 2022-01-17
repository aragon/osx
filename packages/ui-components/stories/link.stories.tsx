import React from 'react';
import {Meta, Story} from '@storybook/react';
import {IconChevronDown, Link, LinkProps} from '../src';

export default {
  title: 'Components/Link',
  component: Link,
} as Meta;

const Template: Story<LinkProps> = args => <Link {...args} />;

export const Default = Template.bind({});
Default.args = {
  label: 'Link text',
  href: 'https://aragon.org/',
};

export const IconRight = Template.bind({});
IconRight.args = {
  iconRight: <IconChevronDown />,
  label: 'Link text',
  href: 'https://aragon.org/',
};

export const IconLeft = Template.bind({});
IconLeft.args = {
  iconLeft: <IconChevronDown />,
  label: 'Link text',
  href: 'https://aragon.org/',
  active: true,
  disabled: true,
};
