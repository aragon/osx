import styled from 'styled-components';
import React, {SyntheticEvent} from 'react';

import {Badge} from '../badge';
import FallbackImg from '../../assets/avatar-token.svg';
import {IconRadioDefault, IconSuccess} from '../icons';

export type ListItemBlockchainProps = {
  domain: string;
  logo?: string;
  name: string;
  selected?: boolean;
  tag?: string;
  onClick?: React.MouseEventHandler;
};

export const ListItemBlockchain: React.FC<ListItemBlockchainProps> = ({
  selected = false,
  ...props
}) => {
  return (
    <Container selected={selected} {...props} data-testid="listItem-blockchain">
      <Logo
        src={props.logo || FallbackImg}
        onError={(e: SyntheticEvent<HTMLImageElement, Event>) => {
          e.currentTarget.src = FallbackImg;
        }}
      />
      <Content>
        <Domain selected={selected}>{props.name}</Domain>
        <Name>{props.domain}</Name>
      </Content>
      {props.tag && <Badge label={props.tag} colorScheme="info" />}
      {selected ? (
        <IconSuccess width={20} height={20} className="text-primary-500" />
      ) : (
        <IconRadioDefault width={20} height={20} className="text-ui-400" />
      )}
    </Container>
  );
};

type SelectedProps = {
  selected: boolean;
};
const Container = styled.div.attrs(({selected}: SelectedProps) => {
  const className = `${
    selected ? 'bg-ui-0' : 'bg-ui-50'
  } flex items-center p-2 space-x-2 rounded-xl cursor-pointer`;
  return {className};
})<SelectedProps>``;

const Domain = styled.p.attrs(({selected}: SelectedProps) => ({
  className: `${selected ? 'text-primary-500' : 'text-ui-600'} font-bold`,
}))<SelectedProps>``;

const Name = styled.p.attrs({className: 'text-sm text-ui-500'})``;

const Logo = styled.img.attrs({className: 'w-6 h-6'})``;

const Content = styled.div.attrs({className: 'flex-1'})``;
