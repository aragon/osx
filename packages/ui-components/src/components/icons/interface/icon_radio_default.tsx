import React from 'react';
import {IconType} from '..';

export const IconRadioDefault: IconType = ({
  height = 24,
  width = 24,
  ...props
}) => {
  return (
    <svg
      width={width}
      height={height}
      fill="none"
      viewBox="0 0 24 24"
      {...props}
    >
      <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="2" />
    </svg>
  );
};
