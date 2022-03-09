import {
  AlertInline,
  Label,
  Link,
  SearchInput,
  TextInput,
} from '@aragon/ui-components';
import React, {useCallback, useEffect, useMemo} from 'react';
import {Controller, useFormContext, useWatch} from 'react-hook-form';
import styled from 'styled-components';
import {chains} from 'use-wallet';
import {useTranslation} from 'react-i18next';
import {useWallet} from 'context/augmentedWallet';
import {useProviders} from 'context/providers';
import {ChainInformation} from 'use-wallet/dist/cjs/types';
import {formatUnits} from 'utils/library';
import {getTokenInfo} from 'utils/tokens';
import {validateTokenAddress} from 'utils/validators';

const DEFAULT_BLOCK_EXPLORER = 'https://etherscan.io/';

type AddExistingTokenType = {
  resetTokenFields: () => void;
};

const AddExistingToken: React.FC<AddExistingTokenType> = ({
  resetTokenFields,
}) => {
  const {t} = useTranslation();
  const {isConnected, chainId, networkName} = useWallet();
  const {infura: provider} = useProviders();
  const {control, setValue, trigger} = useFormContext();

  const [tokenAddress, blockchain, tokenName, tokenSymbol, tokenTotalSupply] =
    useWatch({
      name: [
        'tokenAddress',
        'blockchain',
        'tokenName',
        'tokenSymbol',
        'tokenTotalSupply',
      ],
    });

  const explorer = useMemo(() => {
    if (blockchain.id) {
      const {explorerUrl} = chains.getChainInformation(
        blockchain.id
      ) as ChainInformation;
      return explorerUrl || DEFAULT_BLOCK_EXPLORER;
    }

    return DEFAULT_BLOCK_EXPLORER;
  }, [blockchain.id]);

  // Trigger address validation on network change
  useEffect(() => {
    if (blockchain.id === chainId && tokenAddress !== '' && !tokenSymbol) {
      trigger('tokenAddress');
    }
  }, [blockchain.id, chainId, tokenAddress, tokenSymbol, trigger]);

  /*************************************************
   *            Functions and Callbacks            *
   *************************************************/
  const addressValidator = useCallback(
    async contractAddress => {
      // No wallet
      if (!isConnected()) {
        alert('Connect Wallet');
        return 'Connect Wallet'; // Temporary
      }

      // Wrong network
      if (blockchain.id !== chainId) {
        alert(
          `Chain mismatch: Selected - ${blockchain?.label} but connected to ${networkName}`
        );
        return 'Switch Chain'; // Temporary
      }

      const isValid = await validateTokenAddress(contractAddress, provider);

      if (isValid) {
        try {
          const res = await getTokenInfo(contractAddress, provider);

          setValue('tokenName', res.name);
          setValue('tokenSymbol', res.symbol);
          setValue(
            'tokenTotalSupply',
            formatUnits(res.totalSupply, res.decimals)
          );
        } catch (error) {
          console.error('Error fetching token information', error);
          resetTokenFields();
        }
      }

      return isValid;
    },
    [
      blockchain.id,
      blockchain?.label,
      chainId,
      isConnected,
      networkName,
      provider,
      resetTokenFields,
      setValue,
    ]
  );

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
            validate: addressValidator,
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
              {!invalid && isDirty && tokenSymbol && (
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
