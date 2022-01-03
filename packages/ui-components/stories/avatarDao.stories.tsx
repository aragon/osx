// TODO: combine all avatar stories
import React from 'react';
import {Meta, Story} from '@storybook/react';

import {AvatarDao, AvatarDaoProps} from '../src/components/avatar';

export default {
  title: 'Components/Avatar/Dao',
  component: AvatarDao,
} as Meta;

const Template: Story<AvatarDaoProps> = args => <AvatarDao {...args} />;

export const WithIcon = Template.bind({});
WithIcon.args = {
  src: 'https://banner2.cleanpng.com/20180325/sxw/kisspng-computer-icons-avatar-avatar-5ab7529a8e4e14.9936310115219636745829.jpg',
  domain: 'name.dao.eth',
  label: 'DAO Name',
  contentMode: 'none',
};

export const NoIcon = Template.bind({});
NoIcon.args = {
  label: 'DAO Abc',
};
