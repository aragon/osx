import {
  AlertInline,
  DropdownInput,
  Label,
  ValueInput,
} from '@aragon/ui-components';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import React, {useCallback} from 'react';
import {Controller, useFormContext, useWatch} from 'react-hook-form';

import {handleClipboardActions} from 'utils/library';
import {useTransferModalContext} from 'context/transfersModal';
import {validateAddress, validateTokenAmount} from 'utils/validators';

const ConfigureWithdrawForm: React.FC = () => {
  const {t} = useTranslation();
  const {open} = useTransferModalContext();
  const {control, getValues} = useFormContext();
  const [amount, balance, decimals, symbol] = useWatch({
    name: ['amount', 'tokenBalance', 'tokenDecimals', 'tokenSymbol'],
  });

  /*************************************************
   *             Callbacks and Handlers            *
   *************************************************/
  const handleMaxClicked = useCallback(
    (onChange: React.ChangeEventHandler<HTMLInputElement>) => {
      if (balance) {
        onChange(balance);
      }
    },
    [balance]
  );

  const renderWarning = useCallback(() => {
    // Insufficient data to calculate warning
    if (!decimals || !balance || amount === '') return null;

    if (Number(amount) > Number(balance))
      return (
        <AlertInline label={t('warnings.amountGtDaoToken')} mode="warning" />
      );
  }, [amount, balance, decimals, t]);

  /*************************************************
   *                Field Validators               *
   *************************************************/
  const amountValidator = useCallback(() => {
    const [amount, tokenAddress, tokenDecimals] = getValues([
      'amount',
      'tokenAddress',
      'tokenDecimals',
    ]);

    // check if a token is selected using its address
    if (tokenAddress === '') return t('errors.noTokenSelected');

    return validateTokenAmount(amount, tokenDecimals);
  }, [getValues, t]);

  /*************************************************
   *                    Render                     *
   *************************************************/
  return (
    <>
      {/* Recipient (to) */}
      <FormItem>
        <Label
          label={t('labels.to')}
          helpText={t('newWithdraw.configureWithdraw.toSubtitle')}
        />
        <Controller
          name="to"
          control={control}
          rules={{
            required: t('errors.required.recipient'),
            validate: validateAddress,
          }}
          render={({
            field: {name, onBlur, onChange, value},
            fieldState: {error},
          }) => (
            <>
              <ValueInput
                mode={error ? 'critical' : 'default'}
                name={name}
                value={value}
                onBlur={onBlur}
                onChange={onChange}
                placeholder={t('placeHolders.walletOrEns')}
                adornmentText={value ? t('labels.copy') : t('labels.paste')}
                onAdornmentClick={() => handleClipboardActions(value, onChange)}
              />
              {error?.message && (
                <AlertInline label={error.message} mode="critical" />
              )}
            </>
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
          rules={{required: t('errors.required.token')}}
          render={({field: {name, value}, fieldState: {error}}) => (
            <>
              <DropdownInput
                name={name}
                mode={error ? 'critical' : 'default'}
                value={value}
                onClick={() => open('token')}
                placeholder={t('placeHolders.selectToken')}
              />
              {error?.message && (
                <AlertInline label={error.message} mode="critical" />
              )}
            </>
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
          rules={{
            required: t('errors.required.amount'),
            validate: amountValidator,
          }}
          render={({
            field: {name, onBlur, onChange, value},
            fieldState: {error},
          }) => (
            <>
              <StyledInput
                mode={error ? 'critical' : 'default'}
                name={name}
                type="number"
                value={value}
                onBlur={onBlur}
                onChange={onChange}
                adornmentText={t('labels.max')}
                onAdornmentClick={() => handleMaxClicked(onChange)}
              />
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  {error?.message && (
                    <AlertInline label={error.message} mode="critical" />
                  )}
                  {renderWarning()}
                </div>
                {balance && (
                  <TokenBalance>
                    {`${t('labels.maxBalance')}: ${balance} ${symbol}`}
                  </TokenBalance>
                )}
              </div>
            </>
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

const TokenBalance = styled.p.attrs({
  className: 'flex-1 px-1 text-xs text-right text-ui-600',
})``;

const StyledInput = styled(ValueInput)`
  ::-webkit-inner-spin-button,
  ::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  -moz-appearance: textfield;
`;
