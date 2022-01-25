import React, {ReactNode} from 'react';
import styled from 'styled-components';
import {Badge} from '../badge';
import {LinearProgress} from '../progress';
import {ButtonText} from '../button';
import {AlertInline} from '../alerts';
import {Address, shortenAddress} from '../../utils/addresses';

export type CardProposalProps = {
  /** Proposal Title / Title of the card */
  title: string;
  /** Proposal Description / Description of the card */
  description: string;
  /**
   * Will be called when the button is clicked.
   * */
  onClick: () => void;
  /**
   * Available states that proposal card have. by changing the status,
   * the headers & buttons wil change to proper format also the progress
   * section only available on active state.
   * */
  state: 'draft' | 'pending' | 'active' | 'succeeded' | 'executed' | 'defeated';
  /** The title that appears at the top of the progress bar */
  voteTitle: string;
  /** Progress bar value in percentage (max: 100) */
  voteProgress?: number | string;
  /** Vote label that appears at bottom of the progress bar */
  voteLabel?: string;
  /** Proposal token amount */
  tokenAmount?: string;
  /** Proposal token symbol */
  tokenSymbol?: string;
  /** Publish by sentence in any available languages */
  publishLabel: string;
  /** Publisher's ethereum address **or** ENS name */
  publisherAddress?: Address;
  /**
   * Button label for different status
   * ['pending / executed / defeated label', 'active label', 'succeeded label', 'draft label']
   * TODO: I thought to add 4 button Label
   * props for different states and implement
   * condition here but i decided to use only one prop
   * for reducing the complexity
   */
  buttonLabel: string[];
  AlertMessage?: string;
  /**
   * ['Draft', 'Pending', 'Active', 'Executed', 'Succeeded', 'Defeated']
   */
  StateLabel: string[];
};

export const CardProposal: React.FC<CardProposalProps> = ({
  state = 'pending',
  title,
  description,
  voteTitle,
  voteProgress,
  voteLabel,
  tokenAmount,
  tokenSymbol,
  publishLabel,
  publisherAddress,
  buttonLabel,
  AlertMessage,
  StateLabel,
  onClick,
}: CardProposalProps) => {
  const headerOptions: {
    [key in CardProposalProps['state']]: ReactNode;
  } = {
    draft: <Badge label={StateLabel[0]} />,
    pending: (
      <>
        <Badge label={StateLabel[1]} />
        {AlertMessage && <AlertInline label={AlertMessage} />}
      </>
    ),
    active: (
      <>
        <Badge label={StateLabel[2]} colorScheme={'info'} />
        {AlertMessage && <AlertInline label={AlertMessage} />}
      </>
    ),
    executed: <Badge label={StateLabel[3]} colorScheme={'success'} />,
    succeeded: <Badge label={StateLabel[4]} colorScheme={'success'} />,
    defeated: <Badge label={StateLabel[5]} colorScheme={'critical'} />,
  };

  const SelectButtonStatus = (state: CardProposalProps['state']) => {
    if (['pending', 'executed', 'defeated'].includes(state)) {
      return (
        <StyledButton
          size="large"
          mode="secondary"
          label={buttonLabel[0]}
          onClick={onClick}
          bgWhite
        />
      );
    } else if (state === 'active') {
      return (
        <StyledButton
          size="large"
          mode="primary"
          label={buttonLabel[1]}
          onClick={onClick}
        />
      );
    } else if (state === 'succeeded') {
      return (
        <StyledButton
          size="large"
          mode="primary"
          label={buttonLabel[2]}
          onClick={onClick}
        />
      );
    } else {
      // Draft
      return (
        <StyledButton
          size="large"
          mode="secondary"
          label={buttonLabel[3]}
          onClick={onClick}
          bgWhite
        />
      );
    }
  };

  return (
    <Card data-testid="cardProposal">
      <Header>{headerOptions[state]}</Header>
      <TextContent>
        <Title>{title}</Title>
        <Description>{description}</Description>
        <Publisher>
          {/* We should add link here for address */}
          {publishLabel} {shortenAddress(publisherAddress || '')}
        </Publisher>
      </TextContent>
      {state === 'active' && (
        <LoadingContent>
          <ProgressInfoWrapper>
            <ProgressTitle>{voteTitle}</ProgressTitle>
            <TokenAmount>
              {tokenAmount} {tokenSymbol}
            </TokenAmount>
          </ProgressInfoWrapper>
          <LinearProgress max={100} value={voteProgress} />
          <ProgressInfoWrapper>
            <Vote>{voteLabel}</Vote>
            <Percentage>{voteProgress}%</Percentage>
          </ProgressInfoWrapper>
        </LoadingContent>
      )}
      <Actions>{SelectButtonStatus(state)}</Actions>
    </Card>
  );
};

const Card = styled.div.attrs({
  className: 'flex justify-between flex-col bg-white rounded-xl p-3 space-y-3',
})``;

const Header = styled.div.attrs({
  className: 'flex justify-between',
})``;

const Title = styled.h2.attrs({
  className: 'text-ui-800 font-bold text-xl',
})``;

const Description = styled.p.attrs({
  className: 'text-ui-600 font-normal text-base',
})``;

const Publisher = styled.span.attrs({
  className: 'text-ui-500 text-sm',
})``;

const TextContent = styled.div.attrs({
  className: 'flex flex-col space-y-1.5',
})``;

const LoadingContent = styled.div.attrs({
  className: 'flex flex-col space-y-2',
})``;

const ProgressInfoWrapper = styled.div.attrs({
  className: 'flex justify-between',
})``;

const ProgressTitle = styled.h3.attrs({
  className: 'text-ui-800 text-base font-bold',
})``;

const TokenAmount = styled.span.attrs({
  className: 'text-ui-500 text-sm',
})``;

const Vote = styled.span.attrs({
  className: 'text-primary-500 font-bold text-base',
})``;

const Percentage = styled.span.attrs({
  className: 'text-primary-500 font-bold text-base',
})``;

const Actions = styled.div.attrs({
  className: 'flex',
})``;

const StyledButton = styled(ButtonText).attrs({
  className: 'tablet:w-auto w-full',
})``;
