import React from 'react';
import styled from 'styled-components';

export type AvatarProps = {
  /** Change Avatar's border Radius */
  mode?: 'circle' | 'square';
  /** Changes a Avatar's size */
  size: 'small' | 'default' | 'large';
  /** URL of the Avatar's src */
  src: string;
};

/** Simple Avatar*/
export const Avatar: React.FC<AvatarProps> = ({
  mode = 'circle',
  size = 'default',
  src,
}) => {
  return <StyledAvatar {...{mode, size, src}} />;
};

type StyledAvatarProps = Pick<AvatarProps, 'mode' | 'size'>;

type SizesType = Record<AvatarProps['size'], string>;

const StyledAvatar = styled.img.attrs(({size, mode}: StyledAvatarProps) => {
  const sizes: SizesType = {
    small: 'w-3 h-3',
    default: 'w-5 h-5',
    large: 'w-6 h-6',
  };
  const className: string = `bg-ui-100
    ${sizes[size]}
    ${mode === 'circle' ? 'rounded-full' : 'rounded-2xl'}
  `;

  return {className};
})<StyledAvatarProps>``;
