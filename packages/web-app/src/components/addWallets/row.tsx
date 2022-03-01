import {
  AlertInline,
  ButtonIcon,
  IconMenuVertical,
  Label,
  ListItemAction,
  Popover,
  TextInput,
  NumberInput,
  ValueInput,
} from '@aragon/ui-components';
import React, {useState} from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {Controller, useFormContext} from 'react-hook-form';

import {handleClipboardActions} from 'utils/library';
import {useWallet} from 'context/augmentedWallet';
import {validateAddress} from 'utils/validators';

type WalletRowProps = {
  index: number;
  onDelete?: (index: number) => void;
};

export type WalletField = {
  id: string;
  address: string;
  amount: string;
};

const WalletRow: React.FC<WalletRowProps> = ({index, onDelete}) => {
  const {t} = useTranslation();
  const [isDuplicate, setIsDuplicate] = useState<boolean>(false);
  const {account} = useWallet();
  const {control, getValues, setValue, trigger} = useFormContext();
  const walletFieldArray = getValues('wallets');

  const calculateTotalTokenSupply = (value: number) => {
    let totalSupply = 0;
    if (walletFieldArray) {
      walletFieldArray.forEach(
        (wallet: WalletField) =>
          (totalSupply = parseInt(wallet.amount) + totalSupply)
      );
    }
    const CalculateNaN = Math.floor((value / totalSupply) * 100);
    return totalSupply && !isNaN(CalculateNaN) ? CalculateNaN + '%' : '';
  };

  const addressValidator = (address: string, index: number) => {
    let validationResult = validateAddress(address);
    setIsDuplicate(false);
    if (walletFieldArray) {
      walletFieldArray.forEach((wallet: WalletField, walletIndex: number) => {
        if (address === wallet.address && index !== walletIndex) {
          validationResult = t('errors.duplicateAddress') as string;
          setIsDuplicate(true);
        }
      });
    }
    return validationResult;
  };

  const amountValidation = (index: number) => {
    let totalSupply = 0;
    const address = getValues(`wallets.${index}.address`);
    if (address === '') trigger(`wallets.${index}.address`);
    walletFieldArray.forEach((wallet: WalletField) => {
      totalSupply = parseInt(wallet.amount) + totalSupply;
    });
    setValue('tokenTotalSupply', totalSupply);
    return totalSupply === 0 ? t('errors.totalSupplyZero') : true;
  };

  return (
    <Container data-testid="wallet-row">
      <LabelContainer>
        <Controller
          name={`wallets.${index}.address`}
          control={control}
          rules={{
            required: t('errors.required.walletAddress') as string,
            validate: value => addressValidator(value, index),
          }}
          render={({field, fieldState: {error}}) => (
            <>
              <LabelWrapper>
                <Label label={t('labels.walletList.address')} />
              </LabelWrapper>
              <ValueInput
                mode={error ? 'critical' : 'default'}
                name={field.name}
                value={field.value === account ? 'My Wallet' : field.value}
                onBlur={field.onBlur}
                onChange={field.onChange}
                disabled={index === 0}
                adornmentText={
                  field.value ? t('labels.copy') : t('labels.paste')
                }
                onAdornmentClick={() =>
                  handleClipboardActions(
                    field.value === account ? account : field.value,
                    field.onChange
                  )
                }
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

      <WalletMenuContainer>
        <Popover
          side="bottom"
          align="end"
          width={240}
          content={
            <div className="p-1.5">
              <ListItemAction
                title={t('labels.removeWallet')}
                {...(typeof onDelete === 'function'
                  ? {
                      onClick: () => {
                        const [totalSupply, amount] = getValues([
                          'tokenTotalSupply',
                          `wallets.${index}.amount`,
                        ]);
                        setValue('tokenTotalSupply', totalSupply - amount);
                        onDelete(index);
                      },
                    }
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
      </WalletMenuContainer>

      <Break />

      <Controller
        name={`wallets.${index}.amount`}
        control={control}
        rules={{
          required: t('errors.required.amount'),
          validate: () => amountValidation(index),
        }}
        render={({field, fieldState: {error}}) => (
          <>
            <ButtonWrapper>
              <LabelWrapper>
                <Label label={t('labels.amount')} />
              </LabelWrapper>

              <NumberInput
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                placeholder="0"
                min={0}
                disabled={isDuplicate}
                mode={error?.message ? 'critical' : 'default'}
                value={field.value}
              />
              {error?.message && (
                <ErrorContainer>
                  <AlertInline label={error.message} mode="critical" />
                </ErrorContainer>
              )}
            </ButtonWrapper>
            <InputWrapper>
              <TextInput
                name={field.name}
                value={calculateTotalTokenSupply(field.value)}
                mode="default"
                disabled
              />
            </InputWrapper>
          </>
        )}
      />
    </Container>
  );
};

export default WalletRow;

const Container = styled.div.attrs({
  className: 'flex flex-wrap gap-x-2 gap-y-1.5 p-2 bg-ui-0',
})``;

const LabelContainer = styled.div.attrs({
  className: 'flex-1 tablet:order-1 h-full',
})``;

const LabelWrapper = styled.div.attrs({
  className: 'tablet:hidden mb-0.5',
})``;

const InputWrapper = styled.div.attrs({
  className:
    'flex items-end tablet:items-start tablet:order-3 tablet:pt-0 w-10',
})``;

const WalletMenuContainer = styled.div.attrs({
  className:
    'flex items-start tablet:items-start tablet:order-4 mt-3 tablet:mt-0',
})``;

const ErrorContainer = styled.div.attrs({
  className: 'mt-0.5',
})``;

const Break = styled.hr.attrs({className: 'tablet:hidden w-full border-0'})``;

const ButtonWrapper = styled.div.attrs({
  className: 'flex-1 tablet:order-2 h-full',
})``;
