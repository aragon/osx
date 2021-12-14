import React from 'react';
import {Meta, Story} from '@storybook/react';
import {SearchInput, SearchInputProps} from '../src';

export default {
  title: 'Components/Input/Search',
  component: SearchInput,
} as Meta;

const Template: Story<SearchInputProps> = args => <SearchInput {...args} />;

export const Search = Template.bind({});
Search.args = {
  mode: 'default',
  placeholder: 'Placeholder',
};
