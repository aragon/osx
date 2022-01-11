import React from 'react';
import {Meta, Story} from '@storybook/react';
import {CardTransfer, CardTransferProps} from '../src';

export default {
  title: 'Components/Cards/Transfer',
  component: CardTransfer,
} as Meta;

const Template: Story<CardTransferProps> = args => <CardTransfer {...args} />;

export const Default = Template.bind({});
Default.args = {
  to: 'Patito DAO',
  from: '0x3430008404144CD5000005A44B8ac3f4DB2a3434',
  toLabel: 'To',
  fromLabel: 'From',
};
