import React from 'react';
import styled from 'styled-components';
import {
  IconBlock,
  IconRadioCancel,
  IconRadioDefault,
  IconSpinner,
  IconSuccess,
} from '../icons';
import {LabelProps} from '../label';

export type ModeType = 'active' | 'failed' | 'done' | 'succeeded' | 'upcoming';
export type ProgressStatusProps = {
  /**
   * The mode is the state of a progress' status. Simple, init? ;)
   *
   * Think about it this way: Imagine a list of todos. Each of those todos may
   * be associated with a status of progress. If the todo:
   *  - has not been tackled, its progress status would be "upcoming".
   *  - is being tackled, progress status would be "active".
   *  - has been tackled, its progress status would be "done".
   *
   * The additional states "succeeded" and "failed" can be used to additionally
   * describe a todo that is done.
   */
  mode: ModeType;
  /**
   * Describes the name of the progress step. Think of it as the name of the
   * todo in the example above.
   */
  label: string;
  /**
   * Describes when the progress status was last changed. Every mode of progress
   * status MUST have a date, EXCEPT for "upcoming", which NEVER has a date, (as
   * it is in the future).
   *
   * If no date is passed when one is required, a fallback text will be displayed.
   * */
  date?: string;
  /**
   * If the progress status changed due to an event on a blockchain, the
   * corresponding block MAY be passed. Note that upcoming, active and rejected
   * mode can NEVER have a block associated.
   */
  block?: string;
};

export const ProgressStatus: React.FC<ProgressStatusProps> = ({
  label,
  mode,
  date,
  block,
}) => {
  if (mode !== 'upcoming' && !date) date = 'No information available';
  if (mode === 'upcoming') date = '';
  const mayHaveBlock = mode === 'done' || mode === 'succeeded';
  return (
    <TopContainer data-testid="progressStatus">
      <LeftContainer mode={mode}>
        <IconContainer>
          <Icon mode={mode} />
        </IconContainer>
        <LabelContainer>
          <CustomLabel label={label} helpText={date} />
        </LabelContainer>
      </LeftContainer>
      {block && mayHaveBlock && (
        <BlockContainer>
          <p>{block}</p>
          <div className="pt-0.25">
            <IconBlock className="text-ui-400" />
          </div>
        </BlockContainer>
      )}{' '}
    </TopContainer>
  );
};

type ModeProps = {
  mode: ModeType;
};

const TopContainer = styled.div.attrs({className: 'flex justify-between'})``;

const LeftContainer = styled.div.attrs(({mode}: ModeProps) => {
  const className: string | undefined = 'flex space-x-1.5 ' + textColors[mode];
  return {className};
})<ModeProps>``;

const IconContainer = styled.div.attrs({className: 'my-2'})``;

const LabelContainer = styled.div.attrs({className: 'my-1.5'})``;

const BlockContainer = styled.div.attrs({
  className: 'flex items-start max-h-full space-x-1 my-2 text-ui-500 text-sm',
})``;

const textColors: Record<ModeType, string> = {
  active: 'text-primary-500',
  upcoming: 'text-primary-500',
  done: 'text-ui-800',
  succeeded: 'text-success-800',
  failed: 'text-critical-800',
};

const iconColors: Record<ModeType, string> = {
  active: 'text-primary-500',
  upcoming: 'text-primary-500',
  done: 'text-ui-600',
  succeeded: 'text-success-500',
  failed: 'text-critical-500',
};

const Icon: React.FC<ModeProps> = ({mode}) => {
  switch (mode) {
    case 'active':
      return <IconSpinner className={iconColors[mode]} />;
    case 'upcoming':
      return <IconRadioDefault className={iconColors[mode]} />;
    case 'failed':
      return <IconRadioCancel className={iconColors[mode]} />;
    default:
      return <IconSuccess className={iconColors[mode]} />;
  }
};

type CustomLabelProps = Pick<LabelProps, 'label' | 'helpText'>;

/* Lord knows it hurts. */
const CustomLabel: React.FC<CustomLabelProps> = ({label, helpText}) => {
  return (
    <VStack>
      <LabelLine>
        <Heading>{label}</Heading>
      </LabelLine>
      {helpText && <HelpText>{helpText}</HelpText>}
    </VStack>
  );
};

const VStack = styled.div.attrs({
  className: 'space-y-0.5',
})``;

const LabelLine = styled.div.attrs({
  className: 'flex space-x-1.5',
})``;

const Heading = styled.p.attrs({
  className: 'font-bold',
})``;

const HelpText = styled.p.attrs({
  className: 'text-sm font-normal text-ui-500',
})``;
