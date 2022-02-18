import React from 'react';
import {Meta, Story} from '@storybook/react';
import {AlertBanner, AlertBannerProps} from '../src';

export default {
  title: 'Components/Alerts/Banner',
  component: AlertBanner,
} as Meta;

const Template: Story<AlertBannerProps> = args => <AlertBanner {...args} />;

export const Default = Template.bind({});
Default.args = {
  mode: 'info',
  label: 'Testnet Active',
};
