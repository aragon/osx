import React from 'react';
import {Meta, Story} from '@storybook/react';
import styled from 'styled-components';

import * as interface_icons from '../src/components/icons/interface';
import * as module_icons from '../src/components/icons/module';
import * as markdown_icons from '../src/components/icons/markdown';

export default {
  title: 'Components/Icons',
  component: interface_icons.IconAdd,
} as Meta;

const InterfaceList: Story = args => (
  <IconListContainer>
    {Object.entries(interface_icons).map(([name, Icon]) => (
      <IconContainer key={name}>
        <Icon {...args} />
        <span>{name}</span>
      </IconContainer>
    ))}
  </IconListContainer>
);

const ModuleList: Story = args => (
  <IconListContainer>
    {Object.entries(module_icons).map(([name, Icon]) => (
      <IconContainer key={name}>
        <Icon {...args} />
        <span>{name}</span>
      </IconContainer>
    ))}
  </IconListContainer>
);

const MarkdownList: Story = args => (
  <IconListContainer>
    {Object.entries(markdown_icons).map(([name, Icon]) => (
      <IconContainer key={name}>
        <Icon {...args} />
        <span>{name}</span>
      </IconContainer>
    ))}
  </IconListContainer>
);

export const Interface = InterfaceList.bind({});
export const Module = ModuleList.bind({});
export const Markdown = MarkdownList.bind({});

const IconListContainer = styled.div.attrs({
  className: 'flex flex-wrap grid grid-cols-4 gap-4',
})``;

const IconContainer = styled.div.attrs({
  className: 'flex flex-col items-center justify-center p-2 border rounded',
})``;
