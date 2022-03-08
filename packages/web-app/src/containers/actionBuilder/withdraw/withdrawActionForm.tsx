import {
  AlertInline,
  DropdownInput,
  Label,
  ValueInput,
} from '@aragon/ui-components';
import {
  Controller,
  useFormContext,
  useFormState,
  useWatch,
} from 'react-hook-form';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import React, {useCallback, useEffect} from 'react';

import {
  validateAddress,
  validateTokenAddress,
  validateTokenAmount,
} from 'utils/validators';
import {useWallet} from 'context/augmentedWallet';
import {fetchTokenData} from 'services/prices';
import {getTokenInfo, isETH} from 'utils/tokens';
import {useGlobalModalContext} from 'context/globalModals';
import {formatUnits, handleClipboardActions} from 'utils/library';
import {useActionsContext} from 'context/actions';

const WithdrawActionForm: React.FC<{index: number}> = ({index}) => {
  const {t} = useTranslation();
  const {open} = useGlobalModalContext();
  const {setActionsCounter} = useActionsContext();
  const {account, provider} = useWallet();
  const {control, getValues, trigger, resetField, setFocus, setValue} =
    useFormContext();
  const {errors, dirtyFields} = useFormState({control});
  const [tokenAddress, isCustomToken, tokenBalance, symbol] = useWatch({
    name: [
      `actions.${index}.tokenAddress`,
      `actions.${index}.isCustomToken`,
      `actions.${index}.tokenBalance`,
      `actions.${index}.tokenSymbol`,
    ],
  });
  /*************************************************
   *                    Hooks                      *
   *************************************************/
  useEffect(() => {
    if (isCustomToken) setFocus(`actions.${index}.tokenAddress`);
  }, [index, isCustomToken, setFocus]);

  useEffect(() => {
    if (!account || !isCustomToken || !tokenAddress) return;

    const fetchTokenInfo = async () => {
      if (errors.tokenAddress !== undefined) {
        if (dirtyFields.amount)
          trigger([`actions.${index}.amount`, `actions.${index}.tokenSymbol`]);
        return;
      }

      try {
        // fetch token balance and token metadata
        // TODO: replace with commented out code when integrating backend
        const allTokenInfoPromise = Promise.all([
          isETH(tokenAddress)
            ? formatUnits('4242424242400000000000', 18) //provider.getBalance(DAOVaultAddress)
            : formatUnits('4242424242400000000000', 18), //fetchBalance(tokenAddress, DAOVaultAddress, provider),
          fetchTokenData(tokenAddress),
        ]);

        // use blockchain if api data unavailable
        const [balance, data] = await allTokenInfoPromise;
        if (data) {
          setValue(`actions.${index}.tokenName`, data.name);
          setValue(`actions.${index}.tokenSymbol`, data.symbol);
          setValue(`actions.${index}.tokenImgUrl`, data.imgUrl);
        } else {
          const {name, symbol} = await getTokenInfo(tokenAddress, provider);
          setValue(`actions.${index}.tokenName`, name);
          setValue(`actions.${index}.tokenSymbol`, symbol);
        }
        setValue(`actions.${index}.tokenBalance`, balance);
      } catch (error) {
        /**
         * Error is intentionally swallowed. Passing invalid address will
         * return error, but should not be thrown.
         * Also, double safeguard. Should not actually fall into here since
         * tokenAddress should be valid in the first place for balance to be fetched.
         */
        console.error(error);
      }
      if (dirtyFields.amount)
        trigger([`actions.${index}.amount`, `actions.${index}.tokenSymbol`]);
    };

    fetchTokenInfo();
  }, [
    account,
    dirtyFields.amount,
    errors.tokenAddress,
    index,
    isCustomToken,
    provider,
    setValue,
    tokenAddress,
    trigger,
  ]);

  /*************************************************
   *             Callbacks and Handlers            *
   *************************************************/
  const handleMaxClicked = useCallback(
    (onChange: React.ChangeEventHandler<HTMLInputElement>) => {
      if (tokenBalance) {
        onChange(tokenBalance);
      }
    },
    [tokenBalance]
  );

  const renderWarning = useCallback(
    (value: string) => {
      // Insufficient data to calculate warning
      if (!tokenBalance || value === '') return null;

      if (Number(value) > Number(tokenBalance))
        return (
          <AlertInline label={t('warnings.amountGtDaoToken')} mode="warning" />
        );
    },
    [tokenBalance, t]
  );

  /*************************************************
   *                Field Validators               *
   *************************************************/
  const addressValidator = useCallback(
    async (address: string) => {
      if (isETH(address)) return true;

      const validationResult = await validateTokenAddress(address, provider);

      // address invalid, reset token fields
      if (validationResult !== true) {
        resetField(`actions.${index}.tokenName`);
        resetField(`actions.${index}.tokenImgUrl`);
        resetField(`actions.${index}.tokenSymbol`);
        resetField(`actions.${index}.tokenBalance`);
      }

      return validationResult;
    },
    [index, provider, resetField]
  );

  const amountValidator = useCallback(
    async (amount: string) => {
      const tokenAddress = getValues(`actions.${index}.tokenAddress`);

      // check if a token is selected using its address
      if (tokenAddress === '') return t('errors.noTokenSelected');

      // check if token selected is valid
      if (errors.tokenAddress) return t('errors.amountWithInvalidToken');

      try {
        const {decimals} = await getTokenInfo(tokenAddress, provider);

        // run amount rules
        return validateTokenAmount(amount, decimals);
      } catch (error) {
        // catches miscellaneous cases such as not being able to get token decimal
        console.error('Error validating amount', error);
        return t('errors.defaultAmountValidationError');
      }
    },
    [errors.tokenAddress, getValues, index, provider, t]
  );

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
          name={`actions.${index}.to`}
          control={control}
          defaultValue=""
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
          name={`actions.${index}.tokenSymbol`}
          control={control}
          defaultValue=""
          rules={{required: t('errors.required.token')}}
          render={({field: {name, value}, fieldState: {error}}) => (
            <>
              <DropdownInput
                name={name}
                mode={error ? 'critical' : 'default'}
                value={value}
                onClick={() => {
                  setActionsCounter(index);
                  open('token');
                }}
                placeholder={t('placeHolders.selectToken')}
              />
              {error?.message && (
                <AlertInline label={error.message} mode="critical" />
              )}
            </>
          )}
        />
      </FormItem>

      {/* Custom token address */}
      {isCustomToken && (
        <FormItem>
          <Label
            label={t('labels.address')}
            helpText={t('newDeposit.contractAddressSubtitle')}
          />
          <Controller
            name={`actions.${index}.tokenAddress`}
            control={control}
            defaultValue=""
            rules={{
              required: t('errors.required.tokenAddress'),
              validate: addressValidator,
            }}
            render={({
              field: {name, onBlur, onChange, value, ref},
              fieldState: {error},
            }) => (
              <>
                <ValueInput
                  mode={error ? 'critical' : 'default'}
                  ref={ref}
                  name={name}
                  value={value}
                  onBlur={onBlur}
                  onChange={onChange}
                  adornmentText={value ? t('labels.copy') : t('labels.paste')}
                  onAdornmentClick={() =>
                    handleClipboardActions(value, onChange)
                  }
                />
                {error?.message && (
                  <AlertInline label={error.message} mode="critical" />
                )}
              </>
            )}
          />
        </FormItem>
      )}

      {/* Token amount */}
      <FormItem>
        <Label
          label={t('labels.amount')}
          helpText={t('newWithdraw.configureWithdraw.amountSubtitle')}
        />
        <Controller
          name={`actions.${index}.amount`}
          control={control}
          defaultValue=""
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
                  {renderWarning(value)}
                </div>
                {tokenBalance && (
                  <TokenBalance>
                    {`${t('labels.maxBalance')}: ${tokenBalance} ${symbol}`}
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

export default WithdrawActionForm;

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
