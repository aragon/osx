import {
  AlertInline,
  ButtonIcon,
  IconMenuVertical,
  Label,
  ListItemText,
  Popover,
  TextInput,
} from '@aragon/ui-components';
import React, {useCallback} from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {Controller, useFormContext, useFormState} from 'react-hook-form';

import {EMAIL_PATTERN, URL_PATTERN} from 'utils/constants';

type LinkRowProps = {
  index: number;
  onDelete?: (index: number) => void;
};

const LinkRow: React.FC<LinkRowProps> = ({index, onDelete}) => {
  const {t} = useTranslation();
  const {control, clearErrors, getValues, trigger} = useFormContext();
  const {errors} = useFormState();

  /*************************************************
   *                Field Validators               *
   *************************************************/
  const linkedFieldsAreValid = useCallback(
    (currentValue: string, linkedField: string) => {
      const linkedFieldValue = getValues(linkedField);

      // both empty return no errors
      if (currentValue === '' && linkedFieldValue === '') {
        clearErrors(linkedField);
        return true;
      }

      // linked field is empty and has no errors already
      if (linkedFieldValue === '' && errors[linkedField] === undefined) {
        trigger(linkedField);
      }

      // further validation necessary
      return false;
    },
    [clearErrors, errors, getValues, trigger]
  );

  const labelValidator = useCallback(
    (label: string, index: number) => {
      if (linkedFieldsAreValid(label, `links.${index}.link`)) return;

      return label === '' ? t('errors.required.label') : true;
    },
    [linkedFieldsAreValid, t]
  );

  const linkValidator = useCallback(
    (url: string, index: number) => {
      if (linkedFieldsAreValid(url, `links.${index}.label`)) return;

      if (url === '') return t('errors.required.link');

      return new RegExp(URL_PATTERN).test(url) ||
        new RegExp(EMAIL_PATTERN).test(url)
        ? true
        : t('errors.invalidURL');
    },
    [linkedFieldsAreValid, t]
  );

  /*************************************************
   *                    Render                     *
   *************************************************/
  return (
    <Container data-testid="link-row">
      <LabelContainer>
        <Controller
          control={control}
          name={`links.${index}.label`}
          rules={{
            validate: value => labelValidator(value, index),
          }}
          render={({field, fieldState: {error}}) => (
            <>
              <LabelWrapper>
                <Label label={t('labels.label')} />
              </LabelWrapper>
              <TextInput
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                mode={error?.message ? 'critical' : 'default'}
              />
              {error?.message && (
                <ErrorContainer>
                  <AlertInline label={error.message} mode="critical" />
                </ErrorContainer>
              )}
            </>
          )}
        />
      </LabelContainer>

      <LinkContainer>
        <Popover
          side="bottom"
          align="end"
          width={156}
          content={
            <div className="p-1.5">
              <ListItemText
                title={t('labels.removeLink')}
                {...(typeof onDelete === 'function'
                  ? {mode: 'default', onClick: () => onDelete(index)}
                  : {mode: 'disabled'})}
              />
            </div>
          }
        >
          <ButtonIcon
            mode="ghost"
            size="large"
            bgWhite
            icon={<IconMenuVertical />}
            data-testid="trigger"
          />
        </Popover>
      </LinkContainer>

      <Break />

      <ButtonWrapper>
        <Controller
          name={`links.${index}.link`}
          control={control}
          rules={{
            validate: value => linkValidator(value, index),
          }}
          render={({field, fieldState: {error}}) => (
            <>
              <LabelWrapper>
                <Label label={t('labels.link')} />
              </LabelWrapper>

              <TextInput
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                placeholder="https://"
                mode={error?.message ? 'critical' : 'default'}
              />
              {error?.message && (
                <ErrorContainer>
                  <AlertInline label={error.message} mode="critical" />
                </ErrorContainer>
              )}
            </>
          )}
        />
      </ButtonWrapper>
    </Container>
  );
};

export default LinkRow;

const Container = styled.div.attrs({
  className: 'flex flex-wrap gap-x-2 gap-y-1.5 p-2 bg-ui-0',
})``;

const LabelContainer = styled.div.attrs({
  className: 'flex-1 tablet:order-1 h-full',
})``;

const LabelWrapper = styled.div.attrs({
  className: 'tablet:hidden mb-0.5',
})``;

const LinkContainer = styled.div.attrs({
  className: 'tablet:order-3 pt-3.5 tablet:pt-0',
})``;

const ErrorContainer = styled.div.attrs({
  className: 'mt-0.5',
})``;

const Break = styled.hr.attrs({className: 'tablet:hidden w-full border-0'})``;

const ButtonWrapper = styled.div.attrs({
  className: 'flex-1 tablet:order-2 h-full',
})``;
