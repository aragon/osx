import React from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {Control, Controller} from 'react-hook-form';
import {
  DropdownInput,
  Label,
  TextInput,
  ValueInput,
} from '@aragon/ui-components';

import {FormData} from 'pages/newDeposit';
import {useTransferModalContext} from 'context/transfersModal';

type ConfigureWithdrawProps = {control: Control<FormData>};
const ConfigureWithdrawForm: React.FC<ConfigureWithdrawProps> = ({control}) => {
  const {t} = useTranslation();
  const {open} = useTransferModalContext();

  return (
    <>
      <FormItem>
        <Label
          label={t('labels.to')}
          helpText={t('newWithdraw.configureWithdraw.toSubtitle')}
        />
        <ValueInput
          placeholder={t('placeHolders.walletOrEns')}
          adornmentText={t('labels.paste')}
          onAdornmentClick={() => navigator.clipboard.readText().then(alert)}
        />
      </FormItem>

      <FormItem>
        <Label
          label={t('labels.token')}
          helpText={t('newWithdraw.configureWithdraw.tokenSubtitle')}
        />
        <DropdownInput
          placeholder={t('placeHolders.selectToken')}
          onClick={() => open('token')}
        />
      </FormItem>

      <FormItem>
        <Label
          label={t('labels.amount')}
          helpText={t('newWithdraw.configureWithdraw.amountSubtitle')}
        />
        <Controller
          name="amount"
          control={control}
          render={({field: {name, onBlur, onChange, value}}) => (
            <TextInput
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
