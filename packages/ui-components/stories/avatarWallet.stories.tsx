import React from 'react';
import {Meta, Story} from '@storybook/react';

import {AvatarWallet, AvatarWalletProps} from '../src/components/avatar';

export default {
  title: 'Components/Avatar/Wallet',
  component: AvatarWallet,
} as Meta;

const Template: Story<AvatarWalletProps> = args => <AvatarWallet {...args} />;

export const WithIcon = Template.bind({});
WithIcon.args = {
  src: 'https://eu.ui-avatars.com/api/?name=Dao+Name+three&background=0037D2&color=fff',
};

export const WithAddress = Template.bind({});
WithAddress.args = {
  src: '0x6720000000000000000000000000000000007739',
};
