import React from 'react';
import {TextInput, TextInputProps} from './textInput';
import {IconSearch} from '../icons';

/** Simple input with variable styling (depending on mode) */

export type SearchInputProps = Omit<TextInputProps, 'adornment' | 'side'>;

export const SearchInput: React.FC<SearchInputProps> = ({...props}) => {
  return (
    <TextInput
      data-testid="search-input"
      adornment={<IconSearch className="text-ui-300" />}
      side={'left'}
      {...props}
    />
  );
};
