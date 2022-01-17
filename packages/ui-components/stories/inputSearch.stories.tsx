import React, {useState} from 'react';
import {Meta, Story} from '@storybook/react';
import {SearchInput, SearchInputProps} from '../src';

export default {
  title: 'Components/Input/Search',
  component: SearchInput,
} as Meta;

const Template: Story<SearchInputProps> = args => {
  const [value, setValue] = useState<string>('');
  return (
    <SearchInput
      {...args}
      value={value}
      onChange={e => setValue(e.target.value)}
    />
  );
};

export const Search = Template.bind({});
Search.args = {
  mode: 'default',
  placeholder: 'Placeholder',
  disabled: false,
};
