import React from 'react';
import styled from 'styled-components';

import {IconChevronRight} from '../icons';
import {IsAddress, shortenAddress} from '../../utils/addresses';

export type CardTransferProps = {
  to: string;
  from: string;
  toLabel: string;
  fromLabel: string;
  bgWhite?: boolean;
};

/** Transfer header showing the sender and recipient */
export const CardTransfer: React.FC<CardTransferProps> = ({
  to,
  from,
  toLabel,
  fromLabel,
  bgWhite = false,
}) => {
  return (
    <CardContainer data-testid="cardTransfer">
      <Card label={fromLabel} copy={from} bgWhite={bgWhite} />
      <IconChevronRight className="text-ui-600" />
      <Card label={toLabel} copy={to} bgWhite={bgWhite} />
    </CardContainer>
  );
};

type CardProps = {
  label: string;
  copy: string;
  bgWhite: boolean;
};
const Card: React.FC<CardProps> = ({label, copy, bgWhite}) => {
  return (
    <Container bgWhite={bgWhite}>
      <Label>{label}</Label>
      <Value isAddress={IsAddress(copy)}>
        {IsAddress(copy) ? shortenAddress(copy) : copy}
      </Value>
    </Container>
  );
};

const CardContainer = styled.div.attrs({
  className: 'flex items-center space-x-1',
})``;

type ContainerProps = {bgWhite: boolean};
const Container = styled.div.attrs(({bgWhite}: ContainerProps) => {
  return {
    className: `flex-1 py-1.5 px-2 min-w-0 text-left ${
      bgWhite ? 'bg-ui-50' : 'bg-ui-0'
    } rounded-xl`,
  };
})<ContainerProps>``;

const Label = styled.p.attrs({
  className: 'text-sm text-ui-500 capitalize',
})``;

// TODO: Revisit address shortening
type ValueProps = {isAddress: boolean};
const Value = styled.p.attrs(({isAddress}: ValueProps) => {
  const className = isAddress
    ? 'font-bold text-ui-800'
    : 'overflow-hidden font-bold text-ui-800 overflow-ellipsis whitespace-nowrap';

  return {className};
})<ValueProps>``;
