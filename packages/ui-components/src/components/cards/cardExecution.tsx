import React from 'react';
import styled from 'styled-components';
import {CardTransfer, CardTransferProps} from './cardTransfer';
import {CardToken, CardTokenProps} from './cardToken';
import {ButtonText} from '../button';

export type CardExecutionProps = CardTransferProps & {
  /**
   * Title of the card
   */
  title: string;
  /**
   * Description text
   */
  description: string;
  /**
   * Allows the Execution Card component grow horizontally
   * */
  wide?: boolean;
  /** Handler for the switch button. Will be called when the button is clicked.
   * */
  onClick?: () => void;
  /**
   * whether the action button is disabled or not
   */
  disabledAction?: boolean;
} & Omit<
    CardTokenProps,
    | 'type'
    | 'bgWhite'
    | 'changeType'
    | 'tokenUSDValue'
    | 'changeDuringInterval'
    | 'treasurySharePercentage'
    | 'percentageChangeDuringInterval'
  >;

export const CardExecution: React.FC<CardExecutionProps> = ({
  title,
  description,
  to,
  from,
  toLabel,
  fromLabel,
  tokenName,
  tokenImageUrl,
  tokenSymbol,
  tokenCount,
  treasuryShare,
  onClick,
  disabledAction = true,
  wide = false,
}: CardExecutionProps) => {
  return (
    <Card wide={wide} data-testid="cardExecution">
      <Header>
        <Title>{title}</Title>
        <Description>{description}</Description>
      </Header>
      <Content>
        <CardTransfer {...{to, from, toLabel, fromLabel}} bgWhite />
        <CardToken
          {...{
            tokenName,
            tokenImageUrl,
            tokenSymbol,
            tokenCount,
            treasuryShare,
          }}
          type={'transfer'}
          bgWhite
        />
      </Content>
      <Action>
        <ButtonText
          label={'Execute Now'}
          onClick={onClick}
          {...(disabledAction && {disabled: true})}
        />
      </Action>
    </Card>
  );
};

type CardProps = Pick<CardExecutionProps, 'wide'>;

const Card = styled.div.attrs(({wide}: CardProps) => ({
  className: `${
    wide ? 'flex justify-between' : 'w-84'
  } flex-col bg-white rounded-xl p-3 space-y-3`,
}))<CardProps>``;

const Header = styled.div.attrs({
  className: 'flex flex-col space-y-1',
})``;

const Title = styled.h2.attrs({
  className: 'text-ui-800 font-bold text-2xl',
})``;

const Description = styled.p.attrs({
  className: 'text-ui-600 font-normal text-normal',
})``;

const Content = styled.div.attrs({
  className: 'flex flex-col space-y-1.5',
})``;

const Action = styled.div.attrs({
  className: 'flex',
})``;
