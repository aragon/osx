import React from 'react';
import styled from 'styled-components';

export interface CardTextProps {
  type: 'title' | 'label';
  title: string;
  content: string;
  bgWhite?: boolean;
}

export const CardText: React.FC<CardTextProps> = ({type, title, content, bgWhite = false}) => {
  return (
    <Container data-testid="card-text" bgWhite={bgWhite}>
      <Title type={type}>{title}</Title>
      <p>{content}</p>
    </Container>
  );
};

type ContainerProps = Pick<CardTextProps, 'bgWhite'>;

const Container = styled.div.attrs(({bgWhite} : ContainerProps) => {
  const className = `${!bgWhite && 'bg-ui-0'} p-2 tablet:p-3 font-normal rounded-xl space-y-1 text-ui-600`;
  return {className};
})<ContainerProps>``;

type TitleProps = Pick<CardTextProps, 'type'>;

const Title = styled.p.attrs(({type} : TitleProps) => {
  const className = `${type === 'label' ? 'text-sm  text-ui-500': 'text-base text-ui-800'} font-bold`;
  return {className};
})<TitleProps>``;
