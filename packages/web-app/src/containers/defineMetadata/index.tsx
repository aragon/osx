import {
  AlertInline,
  Label,
  TextareaSimple,
  TextInput,
} from '@aragon/ui-components';
import React from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {Controller, useFormContext} from 'react-hook-form';

const DefineMetadata: React.FC = () => {
  const {t} = useTranslation();
  const {control} = useFormContext();

  return (
    <>
      {/* Name */}
      <FormItem>
        <Label
          label={t('labels.daoName')}
          helpText={t('createDAO.step2.nameSubtitle')}
        />

        <Controller
          name="daoName"
          control={control}
          render={({field, fieldState: {error}}) => (
            <>
              <TextInput {...field} placeholder={t('placeHolders.daoName')} />
              {error?.message && (
                <AlertInline label={error.message} mode="critical" />
              )}
            </>
          )}
        />
      </FormItem>

      {/* Logo */}
      <FormItem>
        <Label
          label={t('labels.logo')}
          helpText={t('createDAO.step2.logoSubtitle')}
          isOptional
          badgeLabel={t('labels.optional')}
        />
        <Controller
          name="daoLogo"
          control={control}
          render={({fieldState: {error}}) => (
            <>
              {/* TODO: replace with proper logo component */}
              <div className="flex justify-center items-center w-8 h-8 bg-ui-0 rounded-xl border-2 border-dashed">
                +
              </div>
              {error?.message && (
                <AlertInline label={error.message} mode="critical" />
              )}
            </>
          )}
        />
      </FormItem>

      {/* Summary */}
      <FormItem>
        <Label
          label={t('labels.description')}
          helpText={t('createDAO.step2.descriptionSubtitle')}
        />
        <Controller
          name="daoName"
          control={control}
          render={({field, fieldState: {error}}) => (
            <>
              <TextareaSimple
                {...field}
                placeholder={t('placeHolders.daoDescription')}
              />
              {error?.message && (
                <AlertInline label={error.message} mode="critical" />
              )}
            </>
          )}
        />
      </FormItem>

      {/* Links */}
      <FormItem>
        <Label
          label={t('labels.links')}
          helpText={t('createDAO.step2.linksSubtitle')}
        />
        <>
          {/* TODO: replace with proper logo component */}
          <div className="h-25 bg-ui-0 rounded-xl">
            Placeholder links component
          </div>
          {/* <AlertInline label="Wire up field error message" mode="critical" /> */}
        </>
      </FormItem>
    </>
  );
};

export default DefineMetadata;

const FormItem = styled.div.attrs({
  className: 'space-y-1.5',
})``;
