import React from 'react';
import {Meta, Story} from '@storybook/react';

import {ButtonWallet, ButtonWalletProps} from '../src';

export default {
  title: 'Components/Buttons/Wallet',
  component: ButtonWallet,
} as Meta;

const Template: Story<ButtonWalletProps> = args => <ButtonWallet {...args} />;

export const Default = Template.bind({});
Default.args = {
  disabled: true,
  label: '0x6720000000000000000000000000000000007739',
  isConnected: true,
  src: 'https://banner2.cleanpng.com/20180325/sxw/kisspng-computer-icons-avatar-avatar-5ab7529a8e4e14.9936310115219636745829.jpg',
};

export const Active = Template.bind({});
Active.args = {
  isSelected: true,
  isConnected: true,
  label: '0x6720000000000000000000000000000000007739',
  src: 'https://banner2.cleanpng.com/20180325/sxw/kisspng-computer-icons-avatar-avatar-5ab7529a8e4e14.9936310115219636745829.jpg',
};

export const notConnected = Template.bind({});
notConnected.args = {
  label: 'Login',
  isConnected: false,
  src: 'https://banner2.cleanpng.com/20180325/sxw/kisspng-computer-icons-avatar-avatar-5ab7529a8e4e14.9936310115219636745829.jpg',
};
