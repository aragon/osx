import React from 'react';
import {IconType} from '..';

export const IconCheckboxDefault: IconType = ({
  height = 16,
  width = 16,
  ...props
}) => {
  return (
    <svg
      width={width}
      height={height}
      fill="none"
      viewBox="0 0 16 16"
      {...props}
    >
      <path
        d="M14.1213 1.87868C14.6839 2.44129 15 3.20435 15 4V12C15 12.7957 14.6839 13.5587 14.1213 14.1213C13.5587 14.6839 12.7957 15 12 15H4C3.20435 15 2.44129 14.6839 1.87868 14.1213C1.31607 13.5587 1 12.7957 1 12V4C1 3.20435 1.31607 2.44129 1.87868 1.87868C2.44129 1.31607 3.20435 1 4 1H12C12.7957 1 13.5587 1.31607 14.1213 1.87868Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
};
