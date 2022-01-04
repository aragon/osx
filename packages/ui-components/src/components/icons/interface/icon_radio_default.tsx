import React from 'react';
import {IconType} from '..';

export const IconRadioDefault: IconType = ({
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
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
};
