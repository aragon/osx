import React from 'react';
import {Meta, Story} from '@storybook/react';
import {CardText, CardTextProps} from '../src/components/cards';

export default {
  title: 'Components/Cards/Text',
  component: CardText,
} as Meta;

const Template: Story<CardTextProps> = args => <CardText {...args} />;

export const Text = Template.bind({});
Text.args = {
  type: 'label',
  title: 'Title',
  content: 'Copy',
  bgWhite: true,
};
