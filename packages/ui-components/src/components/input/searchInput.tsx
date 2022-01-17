import React from 'react';
import {TextInput, TextInputProps} from './textInput';
import {IconSearch, IconClose} from '../icons';
import {Spinner} from '../spinner';

export type SearchInputProps = Omit<
  TextInputProps,
  'leftAdornment' | 'rightAdornment'
> & {
  /**
   * Change input state into isLoading...
   */
  isLoading?: boolean;
};

export const SearchInput: React.FC<SearchInputProps> = ({
  isLoading = false,
  value,
  onChange,
  ...props
}) => {
  return (
    <TextInput
      data-testid="search-input"
      leftAdornment={
        isLoading ? (
          <Spinner size={'small'} />
        ) : (
          <IconSearch className="text-ui-300" />
        )
      }
      value={value}
      onChange={onChange}
      rightAdornment={
        value !== '' && (
          <button
            style={{cursor: 'pointer'}}
            onClick={() => {
              if (onChange) {
                onChange({
                  target: {
                    value: '',
                  },
                } as React.ChangeEvent<HTMLInputElement>);
              }
            }}
          >
            <IconClose className="text-ui-300" />
          </button>
        )
      }
      {...props}
    />
  );
};
