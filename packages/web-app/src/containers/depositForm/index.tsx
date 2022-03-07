import {
  AlertInline,
  ButtonWallet,
  DropdownInput,
  Label,
  TextareaSimple,
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
import {constants, utils} from 'ethers';
import React, {useCallback, useEffect} from 'react';

import {useWallet} from 'context/augmentedWallet';
import {fetchTokenData} from 'services/prices';
import {handleClipboardActions} from 'utils/library';
import {useGlobalModalContext} from 'context/globalModals';
import {fetchBalance, getTokenInfo, isETH} from 'utils/tokens';
import {validateTokenAddress, validateTokenAmount} from 'utils/validators';

const DepositForm: React.FC = () => {
  const {t} = useTranslation();
  const {open} = useGlobalModalContext();
  const {account, balance: walletBalance, provider} = useWallet();
  const {control, resetField, setValue, setFocus, trigger, getValues} =
    useFormContext();
  const {errors, dirtyFields} = useFormState({control});
  const [tokenAddress, isCustomToken, tokenBalance, tokenSymbol] = useWatch({
    name: ['tokenAddress', 'isCustomToken', 'tokenBalance', 'tokenSymbol'],
  });

  /*************************************************
   *                    Hooks                      *
   *************************************************/
  useEffect(() => {
    if (isCustomToken) setFocus('tokenAddress');
  }, [isCustomToken, setFocus]);

  useEffect(() => {
    if (!account || !isCustomToken || !tokenAddress) return;

    const fetchTokenInfo = async () => {
      if (errors.tokenAddress !== undefined) {
        if (dirtyFields.amount) trigger(['amount', 'tokenSymbol']);
        return;
      }

      try {
        // fetch token balance and token metadata
        const allTokenInfoPromise = Promise.all([
          isETH(tokenAddress)
            ? utils.formatEther(walletBalance)
            : fetchBalance(tokenAddress, account, provider),
          fetchTokenData(tokenAddress),
        ]);

        // use blockchain if api data unavailable
        const [balance, data] = await allTokenInfoPromise;
        if (data) {
          setValue('tokenName', data.name);
          setValue('tokenSymbol', data.symbol);
          setValue('tokenImgUrl', data.imgUrl);
        } else {
          const {name, symbol} = await getTokenInfo(tokenAddress, provider);
          setValue('tokenName', name);
          setValue('tokenSymbol', symbol);
        }
        setValue('tokenBalance', balance);
      } catch (error) {
        /**
         * Error is intentionally swallowed. Passing invalid address will
         * return error, but should not be thrown.
         * Also, double safeguard. Should not actually fall into here since
         * tokenAddress should be valid in the first place for balance to be fetched.
         */
        console.error(error);
      }
      if (dirtyFields.amount) trigger(['amount', 'tokenSymbol']);
    };

    fetchTokenInfo();
  }, [
    account,
    dirtyFields.amount,
    errors.tokenAddress,
    isCustomToken,
    provider,
    setValue,
    tokenAddress,
    trigger,
    walletBalance,
  ]);

  /*************************************************
   *                Field Validators               *
   *************************************************/
  const addressValidator = useCallback(
    async (address: string) => {
      if (isETH(address)) return true;

      const validationResult = await validateTokenAddress(address, provider);

      // address invalid, reset token fields
      if (validationResult !== true) {
        resetField('tokenName');
        resetField('tokenImgUrl');
        resetField('tokenSymbol');
        resetField('tokenBalance');
      }

      return validationResult;
    },
    [provider, resetField]
  );

  const amountValidator = useCallback(
    async (amount: string) => {
      const [tokenAddress, tokenBalance] = getValues([
        'tokenAddress',
        'tokenBalance',
      ]);

      // check if a token is selected using it's address
      if (tokenAddress === '') return t('errors.noTokenSelected');

      // check if token selected is valid
      if (errors.tokenAddress) return t('errors.amountWithInvalidToken');

      try {
        const {decimals} = await getTokenInfo(tokenAddress, provider);

        // run amount rules
        return validateTokenAmount(amount, decimals, tokenBalance);
      } catch (error) {
        // catches miscellaneous cases such as not being able to get token decimal
        console.error('Error validating amount', error);
        return t('errors.defaultAmountValidationError');
      }
    },
    [errors.tokenAddress, getValues, provider, t]
  );

  /*************************************************
   *             Callbacks and Handlers            *
   *************************************************/
  const handleMaxClicked = useCallback(
    (onChange: React.ChangeEventHandler<HTMLInputElement>) => {
      const tokenBalance = getValues('tokenBalance');

      if (tokenBalance !== '') {
        onChange(tokenBalance);
      }
    },
    [getValues]
  );

  /*************************************************
   *                    Render                     *
   *************************************************/
  return (
    <>
      <FormItem>
        <Label label={t('labels.to')} helpText={t('newDeposit.toSubtitle')} />

        {/* TODO: Proper DAO address */}
        <ButtonWallet
          label="patito.dao.eth"
          src={constants.AddressZero}
          isConnected
          disabled
        />
      </FormItem>

      {/* Select token */}
      <FormItem>
        <Label
          label={t('labels.token')}
          helpText={t('newDeposit.tokenSubtitle')}
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

      {/* Custom token address */}
      {isCustomToken && (
        <FormItem>
          <Label
            label={t('labels.address')}
            helpText={t('newDeposit.contractAddressSubtitle')}
          />
          <Controller
            name="tokenAddress"
            control={control}
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
          helpText={t('newDeposit.amountSubtitle')}
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
              <div className="flex justify-between">
                {error?.message && (
                  <AlertInline label={error.message} mode="critical" />
                )}

                {!error?.message && tokenBalance && (
                  <TokenBalance>
                    {`${t('labels.maxBalance')}: ${tokenBalance.slice(
                      0,
                      6
                    )} ${tokenSymbol}`}
                  </TokenBalance>
                )}
              </div>
            </>
          )}
        />
      </FormItem>

      {/* Token reference */}
      <FormItem>
        <Label
          label={t('labels.reference')}
          helpText={t('newDeposit.referenceSubtitle')}
          isOptional={true}
        />
        <Controller
          name="reference"
          control={control}
          render={({field: {name, onBlur, onChange, value}}) => (
            <TextareaSimple
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

export default DepositForm;

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
