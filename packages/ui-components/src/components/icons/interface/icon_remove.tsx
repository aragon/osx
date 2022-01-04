import React from 'react';
import {IconType} from '..';

export const IconRemove: IconType = ({height = 16, width = 16, ...props}) => {
  return (
    <svg
      width={width}
      height={height}
      fill="none"
      viewBox="0 0 16 16"
      {...props}
    >
      <path
        d="M14 7C14.2652 7 14.5196 7.10536 14.7071 7.29289C14.8946 7.48043 15 7.73478 15 8C15 8.26522 14.8946 8.51957 14.7071 8.70711C14.5196 8.89464 14.2652 9 14 9H2C1.73478 9 1.48043 8.89464 1.29289 8.70711C1.10536 8.51957 1 8.26522 1 8C1 7.73478 1.10536 7.48043 1.29289 7.29289C1.48043 7.10536 1.73478 7 2 7H14Z"
        fill="currentColor"
      />
    </svg>
  );
};
