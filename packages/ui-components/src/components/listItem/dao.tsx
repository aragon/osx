import React from 'react';
import styled from 'styled-components';

import {AvatarDao} from '../avatar';
import {Address, shortenAddress} from '../../utils/addresses';
import {IconRadioDefault, IconSuccess} from '../icons';

// TODO: Refactor to use input type radio for accessibility

export type ListItemDaoProps = {
  /** Dao's ethereum address **or** ENS name */
  daoAddress: Address;
  daoLogo?: string;
  daoName: string;
  selected?: boolean;
  /** Handler for ListItem selection */
  onClick?: React.MouseEventHandler;
};

/**
 * List item for DAO selection. Used for switching to different DAO.
 */
export const ListItemDao: React.FC<ListItemDaoProps> = props => {
  return (
    <Container selected={props.selected} onClick={props.onClick}>
      <AvatarDao daoName={props.daoName} src={props.daoLogo} />
      <Content>
        <DaoName selected={props.selected}>{props.daoName}</DaoName>
        <Domain>{shortenAddress(props.daoAddress)}</Domain>
      </Content>
      <IconContainer selected={props.selected}>
        {props.selected ? <IconSuccess /> : <IconRadioDefault />}
      </IconContainer>
    </Container>
  );
};

type Selectable = Pick<ListItemDaoProps, 'selected'>;

const Container = styled.button.attrs(({selected}: Selectable) => {
  const baseClasses =
    'group flex items-center p-2 space-x-2  w-full rounded-xl' +
    ' focus:ring-2 focus:ring-primary-500 focus:outline-none';

  return {
    className: selected
      ? baseClasses + ' bg-ui-0'
      : baseClasses + ' hover:bg-ui-50 focus:bg-ui-50 active:bg-ui-0',
  };
})<Selectable>``;

const Content = styled.div.attrs({
  className: 'flex-1 text-left min-w-0',
})``;

const Domain = styled.p.attrs({
  className: 'text-sm text-ui-500 truncate',
})``;

const DaoName = styled.p.attrs(({selected}: Selectable) => {
  return {
    className: selected
      ? 'font-bold truncate text-primary-500'
      : 'truncate font-bold text-ui-600 group-hover:text-primary-500' +
        ' group-active:text-primary-500',
  };
})<Selectable>``;

const IconContainer = styled.div.attrs(({selected}: Selectable) => {
  return {
    className: selected
      ? 'text-sm text-primary-500'
      : 'text-sm text-ui-400 group-hover:text-primary-500 group-active:text-primary-500',
  };
})<Selectable>``;
