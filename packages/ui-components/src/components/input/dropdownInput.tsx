import React from 'react';
import {TextInput} from './textInput';
import {SearchInputProps} from './searchInput';
import {IconChevronDown} from '../icons';

/** Dropdown input with variable styling (depending on mode) */

export const DropdownInput: React.FC<SearchInputProps> = ({...props}) => {
  return (
    <TextInput
      data-testid="search-input"
      adornment={<IconChevronDown className="text-ui-600" />}
      side={'right'}
      clickable
      {...props}
    />
  );
};
