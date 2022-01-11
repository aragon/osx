import React from 'react';
import {Meta, Story} from '@storybook/react';
import {CardToken, CardTokenProps} from '../src';

export default {
  title: 'Components/Cards/Token',
  component: CardToken,
} as Meta;

const Template: Story<CardTokenProps> = args => <CardToken {...args} />;

export const Default = Template.bind({});
Default.args = {
  tokenName: 'DAI',
  tokenImageUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/4943.png',
  tokenSymbol: 'DAI',
  treasurySharePercentage: '45%',
  tokenCount: '15,000,230.2323',
  tokenUSDValue: '$1',
  treasuryShare: '$15,000,230.23',
  changeDuringInterval: '+$150,002.30',
  percentageChangeDuringInterval: '+ 0.01%',
};

export const WithFallback = Template.bind({});
WithFallback.args = {
  tokenName: 'Patito DAO Token',
  tokenImageUrl: '',
  tokenSymbol: 'PDT',
  tokenCount: '15,000,230.2323',
  tokenUSDValue: 'Value unknown',
  treasuryShare: 'Value unknown',
};

export const Transfer = Template.bind({});
Transfer.args = {
  tokenName: 'DAI',
  tokenImageUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/4943.png',
  tokenSymbol: 'DAI',
  tokenCount: '15,000,230.2323',
  treasuryShare: '$15,000,230.23',
};
