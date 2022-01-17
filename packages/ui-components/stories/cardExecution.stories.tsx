import React from 'react';
import {Meta, Story} from '@storybook/react';
import {CardExecution, CardExecutionProps} from '../src';

export default {
  title: 'Components/Cards/execution',
  component: CardExecution,
} as Meta;

const Template: Story<CardExecutionProps> = args => <CardExecution {...args} />;

export const Default = Template.bind({});
Default.args = {
  title: 'Execution',
  description: `These smart actions are executed when the proposal reaches sufficient support. 
    Find out which actions are executed.`,
  to: 'Patito DAO',
  from: '0x3430008404144CD5000005A44B8ac3f4DB2a3434',
  toLabel: 'To',
  fromLabel: 'From',
  tokenName: 'DAI',
  tokenImageUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/4943.png',
  tokenSymbol: 'DAI',
  tokenCount: '15,000,230.2323',
  treasuryShare: '$1000.0',
};
