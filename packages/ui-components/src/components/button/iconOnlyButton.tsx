import React from 'react';
import styled from 'styled-components';

export type IconOnlyButtonProps = {
  icon: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
};

export const IconOnlyButton: React.FC<IconOnlyButtonProps> = ({
  icon,
  isActive = false,
  onClick,
}) => {
  return (
    <Container isActive={isActive} onClick={onClick}>
      {icon}
    </Container>
  );
};

type ContainerProps = {isActive: boolean};
const Container = styled.button.attrs(({isActive}: ContainerProps) => ({
  className: `flex justify-center items-center py-1.5 px-2 active:text-primary-500 hover:text-primary-500  bg-ui-0 rounded-lg ${
    isActive ? 'text-primary-500' : 'text-ui-600'
  }`,
}))<ContainerProps>``;
