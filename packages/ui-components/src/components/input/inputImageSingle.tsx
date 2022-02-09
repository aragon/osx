import React, {useCallback, useState} from 'react';
import styled from 'styled-components';

import {useDropzone} from 'react-dropzone';
import {IconAdd, IconClose} from '../icons/interface';
import {Spinner} from '../spinner';
import {ButtonIcon} from '../button';

export type InputImageSingleProps = {
  /**
   * onChange Event will fires after uploading a valid image
   */
  onChange: (file: File | null) => void;
  /**
   * All error messages will pass as onError function inputs
   */
  onError: (error: {code: string; message: string}) => void;
  /**
   * limit maximum dimension of the image (in px)
   */
  maxDimension?: number;
  /**
   * limit minimum dimension of the image (in px)
   */
  minDimension?: number;
  /**
   * limit maximum file size of the image (in bytes)
   */
  maxFileSize?: number;
  /**
   * Alow Square image only
   */
  onlySquare?: boolean;
};

export const InputImageSingle: React.FC<InputImageSingleProps> = ({
  onChange,
  maxDimension,
  minDimension,
  maxFileSize,
  onlySquare = false,
  onError,
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const onDrop = useCallback(
    (acceptedFiles: Array<File>, onDropRejected) => {
      if (onDropRejected.length !== 0) {
        onError(onDropRejected[0].errors[0]);
      } else {
        /**
         * Render image to calculate the dimensions
         */
        setLoading(true);
        const image: HTMLImageElement = new Image();
        image.addEventListener('load', () => {
          setLoading(false);
          if (
            maxDimension &&
            (image.width > maxDimension || image.height > maxDimension)
          ) {
            onError({
              code: 'wrong-dimension',
              message: `Please provide a squared image with size between ${minDimension}px and ${maxDimension}px on each side`,
            });
          } else if (
            minDimension &&
            (image.width < minDimension || image.height < minDimension)
          ) {
            onError({
              code: 'wrong-dimension',
              message: `Please provide a squared image with size between ${minDimension}px and ${maxDimension}px on each side`,
            });
            return;
          } else if (
            onlySquare &&
            image.height !== image.width // check if the image is square or not
          ) {
            onError({
              code: 'wrong-dimension',
              message: `Please provide a squared image with size between ${minDimension}px and ${maxDimension}px on each side`,
            });
          } else {
            onChange(acceptedFiles[0]);
            setPreview(image.src);
          }
        });
        image.src = URL.createObjectURL(acceptedFiles[0]);
      }
    },
    [maxDimension, minDimension, onChange, onError, onlySquare]
  );

  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    onDrop,
    ...(maxFileSize && {maxSize: maxFileSize}),
    accept: 'image/jpg, image/jpeg, image/png, image/gif, image/svg',
  });

  if (loading) {
    return (
      <LoadingContainer>
        <Spinner size="small" />
      </LoadingContainer>
    );
  }

  return preview ? (
    <ImageContainer>
      <Preview src={preview} />
      <StyledButton
        icon={<IconClose />}
        size="small"
        mode="secondary"
        onClick={() => {
          setPreview(null);
          onChange(null);
        }}
      />
    </ImageContainer>
  ) : (
    <DefaultContainer
      {...{isDragActive}}
      data-testid="input-image"
      {...getRootProps()}
    >
      <StyledIconAdd {...{isDragActive}} />
      <input {...getInputProps()} />
    </DefaultContainer>
  );
};

type DefaultContainerProps = {
  isDragActive: boolean;
};

const DefaultContainer = styled.div.attrs(
  ({isDragActive}: DefaultContainerProps) => ({
    className: `flex items-center justify-center bg-ui-0
    h-8 w-8 border-dashed ${
      isDragActive ? 'border-primary-500' : 'border-ui-100'
    } border-2 rounded-xl cursor-pointer`,
  })
)<DefaultContainerProps>``;

const LoadingContainer = styled.div.attrs({
  className: `flex items-center justify-center bg-ui-0 
    h-8 w-8 border-dashed border-primary-500 border-2 rounded-xl`,
})``;

const ImageContainer = styled.div.attrs({
  className: 'relative h-8 w-8',
})``;

const Preview = styled.img.attrs({
  className: 'rounded-xl bg-ui-0 h-8 w-8',
})``;

const StyledButton = styled(ButtonIcon).attrs({
  className: 'absolute -top-2 -right-1.75',
})`
  box-shadow: 0px 4px 8px rgba(31, 41, 51, 0.04),
    0px 0px 2px rgba(31, 41, 51, 0.06), 0px 0px 1px rgba(31, 41, 51, 0.04);
`;

const StyledIconAdd = styled(IconAdd).attrs(
  ({isDragActive}: DefaultContainerProps) => ({
    className: `${isDragActive ? 'text-primary-500' : 'text-ui-600'}`,
  })
)<DefaultContainerProps>``;
