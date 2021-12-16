import React from 'react';
import {Meta, Story} from '@storybook/react';

import {IconAdd} from '../src';
import {ButtonIcon, ButtonIconProps} from '../src/components/button/buttonIcon';

export default {
  title: 'Components/Buttons/Icon',
  component: ButtonIcon,
} as Meta;

const Template: Story<ButtonIconProps> = args => <ButtonIcon {...args} />;

export const Default = Template.bind({});
Default.args = {
  icon: <IconAdd />,
  label: 'abc',
  onClick: () => alert('clicked'),
};
