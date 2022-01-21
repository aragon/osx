import React from 'react';
import {Meta, Story} from '@storybook/react';

import {Pagination, PaginationProps} from '../src';

export default {
  title: 'Components/Pagination',
  component: Pagination,
} as Meta;

const Template: Story<PaginationProps> = args => <Pagination {...args} />;

export const Default = Template.bind({});
Default.args = {
  bgWhite: false,
};
