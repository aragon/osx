import React from 'react';
import styled from 'styled-components';
import Blockies from 'react-blockies';

import {IsAddress} from '../../utils/addresses';

export type AvatarProps = {
  /** Change Avatar's border Radius */
  mode?: 'circle' | 'square';
  /** Changes a Avatar's size */
  size: 'small' | 'default' | 'large';
  /** URL of the Avatar's src */
  src: string;
};

type SizesType = Record<AvatarProps['size'], {sizes: string; scale: number}>;

const BLOCKIES_SQUARES = 8;
const sizes: SizesType = {
  small: {sizes: 'w-3 h-3', scale: 3},
  default: {sizes: 'w-5 h-5', scale: 5},
  large: {sizes: 'w-6 h-6', scale: 6},
};

/** Simple Avatar*/
export const Avatar: React.FC<AvatarProps> = ({
  mode = 'circle',
  size = 'default',
  src,
}) => {
  return (
    <AvatarContainer mode={mode} size={size}>
      {IsAddress(src) ? (
        <Blockies
          seed={src}
          size={BLOCKIES_SQUARES}
          scale={sizes[size].scale}
        />
      ) : (
        <StyledAvatar {...{mode, size, src}} />
      )}
    </AvatarContainer>
  );
};

type StyledAvatarProps = Pick<AvatarProps, 'size'>;
type StyledContainerProps = Pick<AvatarProps, 'mode' | 'size'>;

const StyledAvatar = styled.img.attrs(({size}: StyledAvatarProps) => {
  const className = `${sizes[size].sizes}`;
  return {className};
})<StyledAvatarProps>``;

const AvatarContainer = styled.div.attrs(
  ({size, mode}: StyledContainerProps) => {
    const className = `overflow-hidden bg-ui-100
    ${sizes[size].sizes}
    ${mode === 'circle' ? 'rounded-full' : 'rounded-2xl'}
  `;
    return {className};
  }
)<StyledContainerProps>``;
