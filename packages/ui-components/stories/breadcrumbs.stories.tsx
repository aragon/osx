import React from 'react';
import {Meta, Story} from '@storybook/react';
import {Badge, Breadcrumb, BreadcrumbProps, IconFinance} from '../src';

export default {
  title: 'Components/Breadcrumb',
  component: Breadcrumb,
} as Meta;

const Template: Story<BreadcrumbProps> = args => <Breadcrumb {...args} />;

export const Default = Template.bind({});
export const NoTag = Template.bind({});
export const Process = Template.bind({});

Default.args = {
  crumbs: [
    {label: 'Finance', to: '/abc'},
    {label: 'Tokens', to: '/abc'},
    {label: 'Third Level', to: '/abc'},
  ],
  tag: <Badge label="Tagging" />,
  icon: <IconFinance />,
};

NoTag.args = {
  crumbs: [
    {label: 'Finance', to: '/abc'},
    {label: 'Tokens', to: '/abc'},
  ],
  icon: <IconFinance />,
};

Process.args = {
  crumbs: {label: 'New Proposal', to: '/abc'},
  tag: <Badge label="Draft" />,
};
