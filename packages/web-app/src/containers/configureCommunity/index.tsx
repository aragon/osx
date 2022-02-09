import {AlertInline, Label, NumberInput} from '@aragon/ui-components';
import React from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {Controller, useFormContext} from 'react-hook-form';

//TODO: This one gonna remove later
const totalTokens = 1000;

const ConfigureCommunity: React.FC = () => {
  const {t} = useTranslation();
  const {control} = useFormContext();

  return (
    <>
      {/* Minimum approval */}
      <FormItem>
        <Label
          label={t('labels.minimumApproval')}
          helpText={t('createDAO.step4.minimumApprovalSubtitle')}
        />

        <Controller
          name="minimumApproval"
          control={control}
          defaultValue="15"
          render={({
            field: {onBlur, onChange, value, name},
            fieldState: {error},
          }) => (
            <ApprovalWrapper>
              <FormWrapper>
                <NumberInput
                  name={name}
                  value={value}
                  onBlur={onBlur}
                  onChange={onChange}
                  placeholder={t('placeHolders.daoName')}
                  percentage={true}
                />
              </FormWrapper>
              <AlertInline
                label={t('createDAO.step4.alerts.minimumApprovalAlert', {
                  amount: Math.round(totalTokens * (value / 100)),
                  symbol: 'ANT',
                })}
                mode="neutral"
              />
              {error?.message && (
                <AlertInline label={error.message} mode="critical" />
              )}
            </ApprovalWrapper>
          )}
        />
      </FormItem>

      {/* Support */}
      <FormItem>
        <Label
          label={t('labels.support')}
          helpText={t('createDAO.step4.supportSubtitle')}
        />

        <Controller
          name="support"
          control={control}
          defaultValue="50"
          render={({
            field: {onBlur, onChange, value, name},
            fieldState: {error},
          }) => (
            <FormWrapper>
              <NumberInput
                name={name}
                value={value}
                onBlur={onBlur}
                onChange={onChange}
                placeholder={t('placeHolders.daoName')}
                percentage
              />
              {error?.message && (
                <AlertInline label={error.message} mode="critical" />
              )}
            </FormWrapper>
          )}
        />
      </FormItem>

      {/* Duration */}
      <FormItem>
        <Label
          label={t('labels.duration')}
          helpText={t('createDAO.step4.durationSubtitle')}
        />
        <DurationContainer>
          <Controller
            name="days"
            control={control}
            defaultValue="1"
            render={({
              field: {onBlur, onChange, value, name},
              fieldState: {error},
            }) => (
              <TimeLabelWrapper>
                <TimeLabel>{t('createDAO.step4.days')}</TimeLabel>
                <NumberInput
                  name={name}
                  value={value}
                  onBlur={onBlur}
                  onChange={onChange}
                  placeholder={'0'}
                  min="0"
                />
                {error?.message && (
                  <AlertInline label={error.message} mode="critical" />
                )}
              </TimeLabelWrapper>
            )}
          />

          <Controller
            name="hours"
            control={control}
            defaultValue="0"
            render={({
              field: {onBlur, onChange, value, name},
              fieldState: {error},
            }) => (
              <TimeLabelWrapper>
                <TimeLabel>{t('createDAO.step4.hours')}</TimeLabel>
                <NumberInput
                  name={name}
                  value={value}
                  onBlur={onBlur}
                  onChange={onChange}
                  placeholder={'0'}
                  min="0"
                  max="23"
                />
                {error?.message && (
                  <AlertInline label={error.message} mode="critical" />
                )}
              </TimeLabelWrapper>
            )}
          />

          <Controller
            name="minutes"
            control={control}
            defaultValue="0"
            render={({
              field: {onBlur, onChange, value, name},
              fieldState: {error},
            }) => (
              <TimeLabelWrapper>
                <TimeLabel>{t('createDAO.step4.minutes')}</TimeLabel>
                <NumberInput
                  name={name}
                  value={value}
                  onBlur={onBlur}
                  onChange={onChange}
                  placeholder={'0'}
                  min="0"
                  max="59"
                />
                {error?.message && (
                  <AlertInline label={error.message} mode="critical" />
                )}
              </TimeLabelWrapper>
            )}
          />
        </DurationContainer>
        <AlertInline
          label={t('alert.durationAlert') as string}
          mode="neutral"
        />
      </FormItem>
    </>
  );
};

export default ConfigureCommunity;

const FormItem = styled.div.attrs({
  className: 'space-y-1.5',
})``;

const FormWrapper = styled.div.attrs({
  className: 'w-1/2 tablet:w-1/3 pr-1.5',
})``;

const ApprovalWrapper = styled.div.attrs({
  className:
    'flex flex-col tablet:flex-row space-y-1.5 tablet:space-y-0 tablet:space-x-2',
})``;

const DurationContainer = styled.div.attrs({
  className:
    'flex flex-col tablet:flex-row space-y-1.5 tablet:space-y-0 tablet:space-x-1.5',
})``;

const TimeLabelWrapper = styled.div.attrs({
  className: 'w-1/2 tablet:w-full space-y-0.5',
})``;

const TimeLabel = styled.span.attrs({
  className: 'text-sm font-bold text-ui-800',
})``;
