import React from 'react';
import {ButtonText, CheckboxSimple} from '@aragon/ui-components';
import {Controller, useFormContext} from 'react-hook-form';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';

import {useFormStep} from 'components/fullScreenStepper';
import {
  Card,
  Header,
  Title,
  Body,
  Row,
  Label,
  LabelWrapper,
  TextContent,
  Footer,
  ActionWrapper,
} from './blockchain';

const Governance: React.FC = () => {
  const {control, getValues} = useFormContext();
  const {setStep} = useFormStep();
  const {t} = useTranslation();
  const {
    minimumApproval,
    tokenTotalSupply,
    tokenSymbol,
    support,
    durationMinutes,
    durationHours,
    durationDays,
  } = getValues();

  return (
    <Card>
      <Header>
        <Title>{t('labels.review.governance')}</Title>
      </Header>
      <Body>
        <Row>
          <LabelWrapper>
            <Label>{t('labels.minimumApproval')}</Label>
          </LabelWrapper>
          <TextContent>
            {minimumApproval}% (
            {Math.floor(tokenTotalSupply * (minimumApproval / 100))}{' '}
            {tokenSymbol})
          </TextContent>
        </Row>
        <Row>
          <LabelWrapper>
            <Label>{t('labels.minimumSupport')}</Label>
          </LabelWrapper>
          <TextContent>{support}%</TextContent>
        </Row>
        <Row>
          <LabelWrapper>
            <Label>{t('labels.minimumDuration')}</Label>
          </LabelWrapper>
          <TimeWrapper>
            <div>{t('createDAO.review.days', {days: durationDays})}</div>
            <div>{t('createDAO.review.hours', {hours: durationHours})}</div>
            <div>
              {t('createDAO.review.minutes', {minutes: durationMinutes})}
            </div>
          </TimeWrapper>
        </Row>
      </Body>
      <Footer>
        <ActionWrapper>
          <ButtonText label="Edit" mode="ghost" onClick={() => setStep(5)} />
        </ActionWrapper>
        <Controller
          name="reviewCheck.governance"
          control={control}
          defaultValue={false}
          rules={{
            required: t('errors.required.recipient'),
          }}
          render={({field: {onChange, value}}) => (
            <CheckboxSimple
              state={value ? 'active' : 'default'}
              label="These values are correct"
              onClick={() => onChange(!value)}
              multiSelect
            />
          )}
        />
      </Footer>
    </Card>
  );
};

export default Governance;

const TimeWrapper = styled.div.attrs({
  className: 'flex space-x-1.5',
})``;
