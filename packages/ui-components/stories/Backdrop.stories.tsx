import React from 'react';
import {Meta, Story} from '@storybook/react';
import {Backdrop, BackdropProps} from '../src';

export default {
  title: 'Components/Backdrop',
  component: Backdrop,
  argTypes: {
    backgroundColor: {control: 'color'},
  },
} as Meta;

const Template: Story<BackdropProps> = args => <Backdrop {...args} />;

const Content = <div>Test</div>;

export const Default = Template.bind({});
Default.args = {
  visible: false,
  children: Content,
};
