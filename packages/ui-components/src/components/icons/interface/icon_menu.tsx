import React from 'react';
import {IconType} from '..';

export const IconMenu: IconType = ({height = 16, width = 16, ...props}) => {
  return (
    <svg
      width={width}
      height={height}
      fill="none"
      viewBox="0 -6 16 16"
      {...props}
    >
      <path
        d="M14.6665 0H0.66666C0.298474 0 0 0.298474 0 0.66666V1.33332C0 1.70151 0.298474 1.99998 0.66666 1.99998H14.6665C15.0347 1.99998 15.3332 1.70151 15.3332 1.33332V0.66666C15.3332 0.298474 15.0347 0 14.6665 0Z"
        fill="currentColor"
      />
      <path
        d="M9.88087 5.33328H0.44913C0.201083 5.33328 0 5.63176 0 5.99994V6.6666C0 7.03479 0.201083 7.33326 0.44913 7.33326H9.88087C10.1289 7.33326 10.33 7.03479 10.33 6.6666V5.99994C10.33 5.63176 10.1289 5.33328 9.88087 5.33328Z"
        fill="currentColor"
      />
    </svg>
  );
};
