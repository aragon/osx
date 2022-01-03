import React from 'react';
import {Meta, Story} from '@storybook/react';

import {AvatarToken, AvatarTokenProps} from '../src/components/avatar';

export default {
  title: 'Components/Avatar/Token',
  component: AvatarToken,
} as Meta;

const Template: Story<AvatarTokenProps> = args => <AvatarToken {...args} />;

export const WithIcon = Template.bind({});
WithIcon.args = {
  src: 'https://eu.ui-avatars.com/api/?name=Dao+Name+three&background=0037D2&color=fff',
  size: 'small',
};

export const WithFallback = Template.bind({});
WithFallback.args = {};
