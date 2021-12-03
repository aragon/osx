import React from 'react';
import {Meta, Story} from '@storybook/react';
import {TokenCard, TokenCardProps} from '../src';

export default {
  title: 'Components/Token',
  component: TokenCard,
} as Meta;

const Template: Story<TokenCardProps> = args => <TokenCard {...args} />;

export const Default = Template.bind({});
Default.args = {
  tokenName: 'DAI',
  tokenImageUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/4943.png',
  tokenSymbol: 'DAI',
  treasurySharePercentage: '45%',
  tokenCount: '15,000,230.2323',
  tokenUSDValue: '$1',
  treasuryShare: '$15,000,230.2323',
  changeDuringInterval: '+$150,002.3',
  percentageChangeDuringInterval: '+ 0.01%',
};

export const WithFallback = Template.bind({});
WithFallback.args = {
  tokenName: 'Patito DAO Token',
  tokenImageUrl: '',
  tokenSymbol: 'PDT',
  treasurySharePercentage: '45%',
  tokenCount: '15,000,230.2323',
  tokenUSDValue: 'Value unknown',
  treasuryShare: 'Value unknown',
  changeDuringInterval: '+$150,002.3',
  percentageChangeDuringInterval: '+ 0.01%',
};
