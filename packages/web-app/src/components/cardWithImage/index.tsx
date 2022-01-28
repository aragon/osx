import React from 'react';
import styled from 'styled-components';

type CardWithImageProps = {
  imgSrc: string;
  caption: string;
  title: string;
  subtitle: string;
};

const CardWithImage: React.FC<CardWithImageProps> = ({
  imgSrc,
  caption,
  title,
  subtitle,
}) => {
  return (
    <Container>
      <ImageContainer src={imgSrc} />
      <VStack>
        <Caption>{caption}</Caption>
        <Title>{title}</Title>
        <Subtitle>{subtitle}</Subtitle>
      </VStack>
    </Container>
  );
};

export default CardWithImage;

const Container = styled.div.attrs({
  className: 'flex-1 p-3 rounded-xl bg-ui-0',
})``;

const ImageContainer = styled.img.attrs({
  className: 'object-cover mb-2 rounded-xl w-full',
})``;

const VStack = styled.div.attrs({
  className: 'space-y-0.25',
})``;

const Caption = styled.div.attrs({
  className: 'text-sm text-ui-500',
})``;

const Title = styled.div.attrs({
  className: 'font-bold text-ui-800',
})``;

const Subtitle = styled.div.attrs({
  className: 'text-sm text-ui-600',
})``;
