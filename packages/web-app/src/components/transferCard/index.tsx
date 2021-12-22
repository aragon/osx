import React from 'react';
import styled from 'styled-components';
import {isAddress} from 'ethers/lib/utils';
import {useTranslation} from 'react-i18next';
import {shortenAddress} from '@aragon/ui-components/src/utils/addresses';
import {IconChevronRight} from '@aragon/ui-components';

// TODO: If moved to ui-components, add separate label props for to and from
type TransferCardProps = {
  from: string;
  to: string;
};
const TransferCard: React.FC<TransferCardProps> = ({to, from}) => {
  const {t} = useTranslation();

  return (
    <Container>
      <Card>
        <Label>{t('finance.labels.from')}</Label>
        <Value isAddress={isAddress(from)}>
          {isAddress(from) ? shortenAddress(from) : from}
        </Value>
      </Card>
      <IconChevronRight className="text-ui-600" />
      <Card>
        <Label>{t('finance.labels.to')}</Label>
        <Value isAddress={isAddress(to)}>
          {isAddress(to) ? shortenAddress(to) : to}
        </Value>
      </Card>
    </Container>
  );
};

export default TransferCard;

const Container = styled.div.attrs({
  className: 'flex items-center space-x-1',
})``;

const Card = styled.div.attrs({
  className: 'flex-1 py-1.5 px-2 min-w-0 text-left bg-ui-0 rounded-xl',
})``;

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
