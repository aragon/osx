import React, {useState} from 'react';
import styled from 'styled-components';

import {AlertInline} from '@aragon/ui-components/src/components/alerts';
import {ButtonText} from '@aragon/ui-components/src/components/button';
import {SearchInput} from '@aragon/ui-components/src/components/input';
import {LinearProgress} from '@aragon/ui-components/src/components/progress';
import {ButtonGroup, Option} from '@aragon/ui-components/src/components/button';
import {
  VotersTable,
  VoterType,
} from '@aragon/ui-components/src/components/table';
import {CheckboxListItem} from '@aragon/ui-components/src/components/checkbox';
import {useTranslation} from 'react-i18next';

// TODO: Every string and data needed by the component is hardcoded for now.

const voters: Array<VoterType> = [
  {
    wallet: 'DAO XYZ',
    option: 'Yes',
    votingPower: '40%',
    tokenAmount: '1,000TN',
  },
  {
    wallet: 'punk5768.eth',
    option: 'No',
    votingPower: '10%',
    tokenAmount: '200',
  },
  {
    wallet: '0xc54c...ee7a',
    option: 'Yes',
    votingPower: '13.333%',
    tokenAmount: '250TN',
  },
];

export const VotingTerminal: React.FC = () => {
  const [buttonGroupState, setButtonGroupState] = useState('info');
  const [votingInProcess, setVotingInProcess] = useState(false);
  const {t} = useTranslation();

  return (
    <Container>
      <Header>
        <Heading1>{t('votingTerminal.title')}</Heading1>
        <ButtonGroup
          bgWhite
          defaultValue={buttonGroupState}
          onChange={setButtonGroupState}
        >
          <Option value="breakdown" label={t('votingTerminal.breakdown')} />
          <Option value="voters" label={t('votingTerminal.voters')} />
          <Option value="info" label={t('votingTerminal.info')} />
        </ButtonGroup>
      </Header>

      {buttonGroupState === 'breakdown' ? (
        <VStackRelaxed>
          <VStackNormal>
            <HStack>
              <p className="font-bold text-primary-500">
                {t('votingTerminal.yes')}
              </p>
              <p className="flex-1 text-right text-ui-600">{`X ${t(
                'votingTerminal.token'
              )}`}</p>
              <p className="pl-6 font-bold text-primary-500">0%</p>
            </HStack>
            <LinearProgress max={100} value={1} />
          </VStackNormal>

          <VStackNormal>
            <HStack>
              <p className="font-bold text-primary-500">
                {t('votingTerminal.no')}
              </p>
              <p className="flex-1 text-right text-ui-600">{`X ${t(
                'votingTerminal.token'
              )}`}</p>
              <p className="pl-6 font-bold text-primary-500">0%</p>
            </HStack>
            <LinearProgress max={100} value={1} />
          </VStackNormal>
        </VStackRelaxed>
      ) : buttonGroupState === 'voters' ? (
        <div className="space-y-2">
          <SearchInput placeholder={t('votingTerminal.inputPlaceholder')} />
          <VotersTable
            voters={voters}
            onLoadMore={() => console.log('load more clicked')}
          />
        </div>
      ) : (
        <VStackRelaxed>
          <VStackNormal>
            <InfoLine>
              <p>{t('votingTerminal.options')}</p>
              <Strong>{t('votingTerminal.yes+no')}</Strong>
            </InfoLine>
            <InfoLine>
              <p>{t('votingTerminal.strategy')}</p>
              <Strong>{t('votingTerminal.tokenVoting')}</Strong>
            </InfoLine>
            <InfoLine>
              <p>{t('votingTerminal.minimumApproval')}</p>
              <Strong>420k DNT (15%)</Strong>
            </InfoLine>
            <InfoLine>
              <p>{t('votingTerminal.participation')}</p>
              <Strong>0 of 3.5M DNT (0%)</Strong>
            </InfoLine>
            <InfoLine>
              <p>{t('votingTerminal.uniqueVoters')}</p>
              <Strong>0</Strong>
            </InfoLine>
          </VStackNormal>

          <VStackNormal>
            <Strong>{t('votingTerminal.duration')}</Strong>
            <InfoLine>
              <p>{t('votingTerminal.start')}</p>
              <Strong>2021/11/17 00:00 AM UTC+2</Strong>
            </InfoLine>
            <InfoLine>
              <p>{t('votingTerminal.end')}</p>
              <Strong>2021/16/17 00:00 AM UTC+2</Strong>
            </InfoLine>
          </VStackNormal>
        </VStackRelaxed>
      )}

      {votingInProcess ? (
        <VotingContainer>
          <Heading2>{t('votingTerminal.chooseOption')}</Heading2>
          <p className="mt-1 text-ui-500">
            {t('votingTerminal.chooseOptionHelptext')}
          </p>

          <CheckboxContainer>
            <CheckboxListItem
              label={t('votingTerminal.no')}
              helptext={t('votingTerminal.noHelptext')}
            />
            <CheckboxListItem
              label={t('votingTerminal.yes')}
              helptext={t('votingTerminal.yesHelptext')}
            />
          </CheckboxContainer>

          <VoteContainer>
            <ButtonWrapper>
              <ButtonText label={t('votingTerminal.submit')} size="large" />
              <ButtonText
                label={t('votingTerminal.cancel')}
                mode="ghost"
                size="large"
                onClick={() => setVotingInProcess(false)}
              />
            </ButtonWrapper>
            <AlertInline
              label={t('votingTerminal.remainingTime')}
              mode="neutral"
            />
          </VoteContainer>
        </VotingContainer>
      ) : (
        <VoteContainer>
          <ButtonText
            label={t('votingTerminal.voteNow')}
            size="large"
            onClick={() => setVotingInProcess(true)}
            className="w-full tablet:w-max"
          />
          <AlertInline
            label={t('votingTerminal.remainingTime')}
            mode="neutral"
          />
        </VoteContainer>
      )}
    </Container>
  );
};

const Container = styled.div.attrs({
  className: 'tablet:p-3 py-2.5 px-2 rounded-xl bg-ui-0',
})``;

const Header = styled.div.attrs({
  className:
    'tablet:flex tablet:justify-between tablet:items-center mb-4 tablet:mb-5 space-y-2 tablet:space-y-0',
})``;

const Heading1 = styled.h1.attrs({
  className: 'text-2xl font-bold text-ui-800 flex-grow',
})``;

const VStackRelaxed = styled.div.attrs({
  className: 'space-y-3',
})``;

const VStackNormal = styled.div.attrs({
  className: 'space-y-1.5',
})``;

const HStack = styled.div.attrs({
  className: 'flex space-x-1.5',
})``;

const InfoLine = styled.div.attrs({
  className: 'flex justify-between text-ui-600',
})``;

const Strong = styled.p.attrs({
  className: 'font-bold text-ui-800',
})``;

const VotingContainer = styled.div.attrs({
  className: 'mt-6 tablet:mt-5',
})``;

const Heading2 = styled.h2.attrs({
  className: 'text-xl font-bold text-ui-800',
})``;

const CheckboxContainer = styled.div.attrs({
  className: 'tablet:flex mt-3 space-y-1.5 tablet:space-y-0 tablet:space-x-3',
})``;

const VoteContainer = styled.div.attrs({
  className:
    'flex flex-col tablet:flex-row tablet:justify-between items-center tablet:items-center mt-3 space-y-2 tablet:space-y-0',
})``;

const ButtonWrapper = styled.div.attrs({
  className:
    'flex flex-col tablet:flex-row space-y-2 space-x-0 tablet:space-y-0 tablet:space-x-2 w-full tablet:w-max',
})``;
