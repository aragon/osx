import {
  Controller,
  useFormContext,
  useFormState,
  useWatch,
} from 'react-hook-form';

import {
  AlertInline,
  Label,
  Link,
  SearchInput,
  TextInput,
} from '@aragon/ui-components';
import styled from 'styled-components';
import {chains} from 'use-wallet';
import {useTranslation} from 'react-i18next';
import React, {useEffect, useMemo} from 'react';

import {useWallet} from 'context/augmentedWallet';
import {isAddress} from 'ethers/lib/utils';
import {formatUnits} from 'utils/library';
import {getTokenInfo} from 'utils/tokens';
import {ChainInformation} from 'use-wallet/dist/cjs/types';
import {validateTokenAddress} from 'utils/validators';

const DEFAULT_BLOCK_EXPLORER = 'https://etherscan.io/';

type AddExistingTokenType = {
  resetTokenFields: () => void;
};

const AddExistingToken: React.FC<AddExistingTokenType> = ({
  resetTokenFields,
}) => {
  const {t} = useTranslation();
  const {account, provider} = useWallet();
  const {control, resetField, setValue} = useFormContext();
  const {errors} = useFormState({control});

  const [address, chainId, tokenName, tokenSymbol, tokenTotalSupply] = useWatch(
    {
      name: [
        'tokenAddress',
        'blockchain',
        'tokenName',
        'tokenSymbol',
        'tokenTotalSupply',
      ],
    }
  );

  const explorer = useMemo(() => {
    if (chainId.id) {
      const {explorerUrl} = chains.getChainInformation(
        chainId.id
      ) as ChainInformation;
      return explorerUrl || DEFAULT_BLOCK_EXPLORER;
    }

    return DEFAULT_BLOCK_EXPLORER;
  }, [chainId.id]);

  /*************************************************
   *                    Hooks                      *
   *************************************************/
  useEffect(() => {
    // (Temporary) complain about wallet
    if (!account) {
      alert('Please connect your wallet');
      return;
    }

    const fetchContractInfo = async () => {
      // have to include this to "debounce" network calls
      if (!isAddress(address) || errors.tokenAddress) return;

      try {
        const {decimals, name, symbol, totalSupply} = await getTokenInfo(
          address,
          provider
        );

        if (decimals) {
          setValue('tokenName', name);
          setValue('tokenSymbol', symbol);
          setValue('tokenTotalSupply', formatUnits(totalSupply, decimals));
        }
      } catch (error) {
        console.error('Error fetching token information', error);
        resetTokenFields();
      }
    };

    if (errors.tokenAddress !== undefined && tokenName !== '') {
      resetTokenFields();
    } else {
      fetchContractInfo();
    }
  }, [
    account,
    address,
    errors.tokenAddress,
    provider,
    resetField,
    resetTokenFields,
    setValue,
    tokenName,
  ]);

  return (
    <>
      <DescriptionContainer>
        <Title>{t('labels.addExistingToken')}</Title>
        <Subtitle>
          {t('createDAO.step3.addExistingTokenHelptext')}
          <Link label={t('createDAO.step3.tokenHelptextLink')} href="" />.
        </Subtitle>
      </DescriptionContainer>
      <FormItem>
        <DescriptionContainer>
          <Label label={t('labels.address')} />
          <p>
            <span>{t('createDAO.step3.tokenContractSubtitlePart1')}</span>
            <Link label="block explorer" href={explorer} />
            {'. '}
            <span>{t('createDAO.step3.tokenContractSubtitlePart2')}</span>
          </p>
        </DescriptionContainer>
        <Controller
          name="tokenAddress"
          control={control}
          defaultValue=""
          rules={{
            required: t('errors.required.tokenAddress'),
            validate: async value => validateTokenAddress(value, provider),
          }}
          render={({
            field: {name, value, onBlur, onChange},
            fieldState: {error, isDirty, invalid},
          }) => (
            <>
              <SearchInput
                {...{name, value, onBlur, onChange}}
                placeholder="0x..."
              />
              {error?.message && (
                <AlertInline label={error.message} mode="critical" />
              )}
              {!invalid && isDirty && (
                <AlertInline label={t('success.contract')} mode="success" />
              )}
            </>
          )}
        />
        {tokenName && (
          <TokenInfoContainer>
            <InfoContainer>
              <Label label={t('labels.tokenName')} />
              <TextInput disabled value={tokenName} />
            </InfoContainer>
            <InfoContainer>
              <Label label={t('labels.tokenSymbol')} />
              <TextInput disabled value={tokenSymbol} />
            </InfoContainer>
            <InfoContainer>
              <Label label={t('labels.supply')} />
              <TextInput
                disabled
                value={new Intl.NumberFormat('en-US', {
                  maximumFractionDigits: 4,
                }).format(tokenTotalSupply)}
              />
            </InfoContainer>
          </TokenInfoContainer>
        )}
      </FormItem>
    </>
  );
};

export default AddExistingToken;

const FormItem = styled.div.attrs({
  className: 'space-y-1.5',
})``;

const DescriptionContainer = styled.div.attrs({
  className: 'space-y-0.5',
})``;

const Title = styled.p.attrs({className: 'text-lg font-bold text-ui-800'})``;

const Subtitle = styled.p.attrs({className: 'text-ui-600 text-bold'})``;

const TokenInfoContainer = styled.div.attrs({
  className:
    'flex flex-col tablet:flex-row tablet:gap-x-2 gap-y-2 tablet:justify-between tablet:items-center p-2 bg-ui-0 rounded-xl',
})``;

const InfoContainer = styled.div.attrs({
  className: 'space-y-1',
})``;
