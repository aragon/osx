import React from 'react';
import {Meta, Story} from '@storybook/react';
import {WalletCard, WalletCardProps} from '../src';

export default {
  title: 'Components/WalletCard',
  component: WalletCard,
} as Meta;

const Template: Story<WalletCardProps> = args => <WalletCard {...args} />;

export const Default = Template.bind({});
Default.args={
    src:'https://place-hold.it/150x150',
    name:'ens-name.eth',
    address:'0x6720000000000000000000000000000000007739'
}