import React from 'react';
import {Meta, Story} from '@storybook/react';
import {WalletButton, WalletButtonProps} from '../src';

export default {
  title: 'Components/Buttons/Wallet',
  component: WalletButton,
} as Meta;

const Template: Story<WalletButtonProps> = args => <WalletButton {...args} />;

export const Default = Template.bind({});
Default.args = {
  label:'0x6720000000000000000000000000000000007739',
  isConnected:true,
  src: 'https://banner2.cleanpng.com/20180325/sxw/kisspng-computer-icons-avatar-avatar-5ab7529a8e4e14.9936310115219636745829.jpg',
  onClick: () => {
    alert('hey, you just triggered the onClick method :)');
  },
};

export const Active = Template.bind({});
Active.args = {
  isSelected:true,
  isConnected:true,
  label:'0x6720000000000000000000000000000000007739',
  src: 'https://banner2.cleanpng.com/20180325/sxw/kisspng-computer-icons-avatar-avatar-5ab7529a8e4e14.9936310115219636745829.jpg',
  onClick: () => {
    alert('hey, you just triggered the onClick method :)');
  },
};

export const notConnected = Template.bind({});
notConnected.args = {
  label:'Login',
  isConnected:false,
  src: 'https://banner2.cleanpng.com/20180325/sxw/kisspng-computer-icons-avatar-avatar-5ab7529a8e4e14.9936310115219636745829.jpg',
  onClick: () => {
    alert('hey, you just triggered the onClick method :)');
  },
};
