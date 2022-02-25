import {
  AlertInline,
  ButtonIcon,
  IconMenuVertical,
  Label,
  ListItemAction,
  Popover,
  TextInput,
} from '@aragon/ui-components';
import React, {useCallback} from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {Controller, useFormContext, useFormState} from 'react-hook-form';

import {
  EMAIL_PATTERN,
  URL_PATTERN,
  URL_WITH_PROTOCOL_PATTERN,
} from 'utils/constants';

type LinkRowProps = {
  index: number;
  onDelete?: (index: number) => void;
};

const UrlRegex = new RegExp(URL_PATTERN);
const EmailRegex = new RegExp(EMAIL_PATTERN);
const UrlWithProtocolRegex = new RegExp(URL_WITH_PROTOCOL_PATTERN);

const LinkRow: React.FC<LinkRowProps> = ({index, onDelete}) => {
  const {t} = useTranslation();
  const {control, clearErrors, getValues, trigger, setValue} = useFormContext();
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
      if (linkedFieldsAreValid(label, `links.${index}.href`)) return;

      return label === '' ? t('errors.required.label') : true;
    },
    [linkedFieldsAreValid, t]
  );

  const addProtocolToLinks = useCallback(
    (name: string) => {
      const url = getValues(name);

      if (UrlRegex.test(url) || EmailRegex.test(url)) {
        if (UrlRegex.test(url) && !UrlWithProtocolRegex.test(url)) {
          setValue(name, `http://${url}`);
        }
        return true;
      } else {
        return t('errors.invalidURL');
      }
    },
    [getValues, setValue, t]
  );

  const linkValidator = useCallback(
    (url: string, index: number) => {
      if (linkedFieldsAreValid(url, `links.${index}.label`)) return;

      if (url === '') return t('errors.required.link');

      return UrlRegex.test(url) || EmailRegex.test(url)
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
                value={field.value}
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
        <Controller
          name={`links.${index}.href`}
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
                value={field.value}
                onBlur={() => {
                  addProtocolToLinks(field.name);
                  field.onBlur();
                }}
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
      </LinkContainer>

      <Break />
      <ButtonContainer>
        <Popover
          side="bottom"
          align="end"
          width={156}
          content={
            <div className="p-1.5">
              <ListItemAction
                title={t('labels.removeLink')}
                {...(typeof onDelete === 'function'
                  ? {onClick: () => onDelete(index)}
                  : {mode: 'disabled'})}
                bgWhite
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
      </ButtonContainer>
    </Container>
  );
};

export default LinkRow;

const Container = styled.div.attrs({
  className: 'flex flex-wrap gap-x-2 gap-y-1.5 p-2 bg-ui-0',
})``;

const LabelContainer = styled.div.attrs({
  className: 'flex-1 order-1 h-full',
})``;

const LabelWrapper = styled.div.attrs({
  className: 'tablet:hidden mb-0.5',
})``;

const ButtonContainer = styled.div.attrs({
  className: 'pt-3.5 order-2 tablet:order-3 tablet:pt-0',
})``;

const ErrorContainer = styled.div.attrs({
  className: 'mt-0.5',
})``;

const Break = styled.hr.attrs({
  className: 'tablet:hidden w-full border-0 order-3',
})``;

const LinkContainer = styled.div.attrs({
  className: 'flex-1 order-4 tablet:order-2 h-full',
})``;
