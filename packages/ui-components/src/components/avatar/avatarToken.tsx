import React, {SyntheticEvent} from 'react';
import styled from 'styled-components';

import FallbackImg from '../../assets/avatar-token.svg';

export type AvatarTokenProps = {
  size?: 'small' | 'medium' | 'large';
  src?: string;
};

export const AvatarToken: React.FC<AvatarTokenProps> = ({
  size = 'medium',
  src,
}) => {
  return (
    <StyledImage
      size={size}
      src={src || FallbackImg}
      onError={(e: SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.src = FallbackImg;
      }}
    />
  );
};

const styles = {
  small: 'w-2 h-2',
  medium: 'w-3 h-3',
  large: 'w-5 h-5',
};

type SizesType = Pick<AvatarTokenProps, 'size'>;

const StyledImage = styled.img.attrs(({size = 'medium'}: SizesType) => {
  return {className: `${styles[size]} rounded-full`};
})<SizesType>``;
