import {
  DropdownInput,
  Label,
  TextInput,
  ValueInput,
} from '@aragon/ui-components';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import React, {useCallback} from 'react';
import {Controller, useFormContext} from 'react-hook-form';

import {useTransferModalContext} from 'context/transfersModal';

const ConfigureWithdrawForm: React.FC = () => {
  const {t} = useTranslation();
  const {open} = useTransferModalContext();
  const {control} = useFormContext();

  const handleClipboardActions = useCallback(
    async (currentValue: string, onChange: (value: string) => void) => {
      if (currentValue) {
        await navigator.clipboard.writeText(currentValue);

        // TODO: change to proper mechanism
        alert('Copied');
      } else {
        const textFromClipboard = await navigator.clipboard.readText();
        onChange(textFromClipboard);
      }
    },
    []
  );

  return (
    <>
      <FormItem>
        <Label
          label={t('labels.to')}
          helpText={t('newWithdraw.configureWithdraw.toSubtitle')}
        />
        <Controller
          name="to"
          control={control}
          render={({
            field: {name, onBlur, onChange, value},
            fieldState: {error},
          }) => (
            <ValueInput
              mode={error ? 'critical' : 'default'}
              name={name}
              value={value}
              onBlur={onBlur}
              onChange={onChange}
              placeholder={t('placeHolders.walletOrEns')}
              adornmentText={value ? 'Copy' : 'Paste'}
              onAdornmentClick={() => handleClipboardActions(value, onChange)}
            />
          )}
        />
      </FormItem>

      {/* Select token */}
      <FormItem>
        <Label
          label={t('labels.token')}
          helpText={t('newWithdraw.configureWithdraw.tokenSubtitle')}
        />
        <Controller
          name="tokenSymbol"
          control={control}
          render={({field: {name, value}, fieldState: {error}}) => (
            <DropdownInput
              name={name}
              mode={error ? 'critical' : 'default'}
              value={value}
              onClick={() => open('token')}
              placeholder={t('placeHolders.selectToken')}
            />
          )}
        />
      </FormItem>

      {/* Token amount */}
      <FormItem>
        <Label
          label={t('labels.amount')}
          helpText={t('newWithdraw.configureWithdraw.amountSubtitle')}
        />
        <Controller
          name="amount"
          control={control}
          render={({
            field: {name, onBlur, onChange, value},
            fieldState: {error},
          }) => (
            <TextInput
              mode={error ? 'critical' : 'default'}
              side="left"
              name={name}
              value={value}
              onBlur={onBlur}
              onChange={onChange}
            />
          )}
        />
      </FormItem>
    </>
  );
};

export default ConfigureWithdrawForm;

const FormItem = styled.div.attrs({
  className: 'space-y-1.5',
})``;
