import {TokenListItem, TokenListItemProps} from '../src';
import React from 'react';
import {Meta, Story} from '@storybook/react';

export default {
  title: 'Components/TokenListItem',
  component: TokenListItem,
} as Meta;

const Template: Story<TokenListItemProps> = args => (
  <TokenListItem {...args} />
);

export const Default = Template.bind({});
Default.args = {
  tokenName: 'Aragon',
  tokenSymbol: 'ANT',
  tokenAmount: '5000',
  tokenLogo: 'https://banner2.cleanpng.com/20180325/sxw/kisspng-computer-icons-avatar-avatar-5ab7529a8e4e14.9936310115219636745829.jpg',
};
