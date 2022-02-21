import {
  AlertInline,
  CheckboxListItem,
  DateInput,
  DropdownInput,
  Label,
  NumberInput,
} from '@aragon/ui-components';
import {toDate} from 'date-fns-tz';
import {Controller, FieldError, useFormContext} from 'react-hook-form';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import React, {useEffect, useState} from 'react';

import {DateModeSwitch, EndDateType} from './dateModeSwitch';
import {SimplifiedTimeInput} from 'components/inputTime/inputTime';
import UtcMenu from 'containers/utcMenu';
import {timezones} from 'containers/utcMenu/utcData';
import {
  daysToMills,
  getCanonicalDate,
  getCanonicalTime,
  getCanonicalUtcOffset,
  getFormattedUtcOffset,
} from 'utils/date';
import {DateTimeErrors} from './dateTimeErrors';
import {useGlobalModalContext} from 'context/globalModals';

type UtcInstance = 'first' | 'second';

const SetupVotingForm: React.FC = () => {
  const {t} = useTranslation();
  const {open} = useGlobalModalContext();
  const {control, setValue, getValues, setError, formState, clearErrors} =
    useFormContext();

  /*************************************************
   *                    STATE & EFFECT             *
   *************************************************/

  const [endDateType, setEndDateType] = useState<EndDateType>('duration');
  const [utcInstance, setUtcInstance] = useState<UtcInstance>('first');
  const [utcStart, setUtcStart] = useState('');
  const [utcEnd, setUtcEnd] = useState('');

  // Initializes values for the form
  // This is done here rather than in the defaulValues object as time can
  // ellapse between the creation of the form context and this stage of the form.
  useEffect(() => {
    if (!getValues('startTime'))
      setValue('startTime', getCanonicalTime({minutes: 10}));
    if (!getValues('startDate'))
      setValue('startDate', getCanonicalDate({minutes: 10}));
    if (!getValues('endTime'))
      setValue('endTime', getCanonicalTime({days: 5, minutes: 10}));
    if (!getValues('endDate'))
      setValue('endDate', getCanonicalDate({days: 5, minutes: 10}));

    const currTimezone = timezones.find(tz => tz === getFormattedUtcOffset());
    if (!currTimezone) {
      setUtcStart(timezones[13]);
      setUtcEnd(timezones[13]);
      setValue('startUtc', timezones[13]);
      setValue('endUtc', timezones[13]);
    } else {
      setUtcStart(currTimezone);
      setUtcEnd(currTimezone);
      setValue('startUtc', currTimezone);
      setValue('endUtc', currTimezone);
    }
  }, []); //eslint-disable-line

  // validate start time on UTC changes
  // (Doing this in a separate hook is necessary since the UTC selector is
  // currently not controllable using the the form conroller)
  useEffect(() => {
    const fieldErrors: FieldError[] = Object.values(formState.errors);
    const hasEmptyFields = fieldErrors.some(
      e =>
        e.type === 'validate' &&
        (e.ref?.name === 'startDate' || e.ref?.name === 'startTime')
    );

    if (!hasEmptyFields) {
      dateTimeValidator();
    }
  }, [utcStart]); //eslint-disable-line

  // validate end time on UTC changes
  // (Doing this in a separate hook is necessary since the UTC selector is
  // currently not controllable using the the form conroller)
  useEffect(() => {
    const fieldErrors: FieldError[] = Object.values(formState.errors);
    const hasEmptyFields = fieldErrors.some(
      e =>
        e.type === 'validate' &&
        (e.ref?.name === 'endDate' || e.ref?.name === 'endTime')
    );

    if (!hasEmptyFields) {
      dateTimeValidator();
    }
  }, [utcEnd]); //eslint-disable-line

  /*************************************************
   *                Field Validators               *
   *************************************************/

  // validates both start time and date. This validator checks all constraints
  // on the start and end date/time at once. This is necessary, as time date and
  // times validity are tied to each other. If any constraint is violated, an
  // error is constructed and passed to the form state.
  //
  // Note: does not take and argument, as it is not tied to any individual input.
  const dateTimeValidator = () => {
    //build start date/time in utc mills
    const sDate = getValues('startDate');
    const sTime = getValues('startTime');
    const sUtc = getValues('startUtc');

    const canonicalSUtc = getCanonicalUtcOffset(sUtc);
    const startDateTime = toDate(sDate + 'T' + sTime + canonicalSUtc);
    const startMills = startDateTime.valueOf();

    const currDateTime = new Date();
    const currMills = currDateTime.getTime();

    //build end date/time in utc mills
    const eDate = getValues('endDate');
    const eTime = getValues('endTime');
    const eUtc = getValues('endUtc');
    const canonicalEUtc = getCanonicalUtcOffset(eUtc);
    const endDateTime = toDate(eDate + 'T' + eTime + canonicalEUtc);
    const endMills = endDateTime.valueOf();

    const minEndDateTimeMills = startMills + daysToMills(5);

    // check start constraints
    if (startMills < currMills) {
      setError('startTime', {
        type: 'validate',
        message: t('errors.startPast'),
      });
      setError('startDate', {
        type: 'validate',
        message: t('errors.startPast'),
      });
    }
    if (startMills >= currMills) {
      clearErrors('startDate');
      clearErrors('startTime');
    }

    //check end constraints
    if (endMills < minEndDateTimeMills) {
      setError('endTime', {
        type: 'validate',
        message: t('errors.endPast'),
      });
      setError('endDate', {
        type: 'validate',
        message: t('errors.endPast'),
      });
    }
    if (endMills >= minEndDateTimeMills) {
      clearErrors('endDate');
      clearErrors('endTime');
    }

    return '';
  };

  // sets the UTC values for the start and end date/time
  const tzSelector = (tz: string) => {
    if (utcInstance === 'first') {
      setUtcStart(tz);
      setValue('startUtc', tz);
    } else {
      setUtcEnd(tz);
      setValue('endUtc', tz);
    }
  };

  /*************************************************
   *                    Render                     *
   *************************************************/

  return (
    <>
      {/* Voting Type Selection */}
      <FormSection>
        <Label label={t('newWithdraw.setupVoting.optionLabel.title')} />
        <>
          <CheckboxListItem
            label={t('newWithdraw.setupVoting.yesNoLabel.title')}
            helptext={t('newWithdraw.setupVoting.yesNoLabel.helptext')}
            state="active"
            multiSelect={false}
          />
          <AlertInline label={t('infos.newVotingTypes')} mode="neutral" />
        </>
      </FormSection>

      {/* Start Date */}
      <FormSection>
        <Label label={t('labels.start')} />
        <HStack>
          <Controller
            name="startDate"
            control={control}
            rules={{
              required: t('errors.required.date'),
              validate: dateTimeValidator,
            }}
            render={({field: {name, value, onChange, onBlur}}) => (
              <div>
                <DateInput
                  name={name}
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                />
              </div>
            )}
          />
          <Controller
            name="startTime"
            control={control}
            rules={{
              required: t('errors.required.time'),
              // FIXME this triggers the validators, but for some reason they do
              // not assign the error to the correct field
              validate: dateTimeValidator,
            }}
            render={({field: {name, value, onChange, onBlur}}) => (
              <div>
                <SimplifiedTimeInput
                  name={name}
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                />
              </div>
            )}
          />
          <div>
            <DropdownInput
              value={utcStart}
              onClick={() => {
                setUtcInstance('first');
                open('utc');
              }}
            />
          </div>
        </HStack>
        <DateTimeErrors mode={'start'} />
      </FormSection>

      {/* End date */}
      <FormSection>
        <Label
          label={t('labels.end')}
          helpText={t('newWithdraw.setupVoting.endDescription')}
        />
        {endDateType === 'duration' ? (
          <>
            <HStack>
              <DateModeSwitch value={endDateType} setValue={setEndDateType} />
              <Controller
                name="duration"
                control={control}
                rules={{
                  min: {
                    value: 5,
                    message: t('errors.durationTooShort'),
                  },
                  required: t('errors.required.duration'),
                }}
                render={({field: {name, onChange, value}}) => {
                  return (
                    <NumberInput
                      name={name}
                      value={value}
                      min={5}
                      onChange={onChange}
                      width={144}
                    />
                  );
                }}
              />
            </HStack>
            {formState.errors?.duration?.message && (
              <AlertInline
                label={formState.errors.duration.message}
                mode="critical"
              />
            )}
          </>
        ) : (
          <>
            <div className="block space-y-2">
              <div>
                <DateModeSwitch value={endDateType} setValue={setEndDateType} />
              </div>
              <HStack>
                <Controller
                  name="endDate"
                  control={control}
                  rules={{
                    required: t('errors.required.date'),
                    validate: dateTimeValidator,
                  }}
                  render={({field: {name, value, onChange, onBlur}}) => (
                    <div>
                      <DateInput
                        name={name}
                        value={value}
                        onChange={onChange}
                        onBlur={onBlur}
                      />
                    </div>
                  )}
                />
                <Controller
                  name="endTime"
                  control={control}
                  rules={{
                    required: t('errors.required.time'),
                    validate: dateTimeValidator,
                  }}
                  render={({field: {name, value, onChange, onBlur}}) => (
                    <div>
                      <SimplifiedTimeInput
                        name={name}
                        value={value}
                        onChange={onChange}
                        onBlur={onBlur}
                      />
                    </div>
                  )}
                />
                <div>
                  <DropdownInput
                    value={utcEnd}
                    onClick={() => {
                      setUtcInstance('second');
                      open('utc');
                    }}
                  />
                </div>
              </HStack>
            </div>
            <DateTimeErrors mode={'end'} />
          </>
        )}
        <AlertInline label={t('infos.voteDuration')} mode="neutral" />
      </FormSection>
      <UtcMenu onTimezoneSelect={tzSelector} />
    </>
  );
};

export default SetupVotingForm;

const FormSection = styled.div.attrs({
  className: 'space-y-1.5',
})``;

const HStack = styled.div.attrs({
  className: 'inline-flex space-x-1',
})``;
