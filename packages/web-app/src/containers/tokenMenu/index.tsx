import React, {useCallback} from 'react';
import styled from 'styled-components';
import {Modal, SearchInput, ButtonText, IconAdd} from '@aragon/ui-components';
import {Wallet} from 'use-wallet/dist/cjs/types';
import {useTranslation} from 'react-i18next';
import {useForm, Controller} from 'react-hook-form';

import {useWallet} from 'context/augmentedWallet';
import {useTransferModalContext} from 'context/transfersModal';
import {curatedTokens} from 'utils/network';
import TokenBox from './tokenBox';

const TokenMenu: React.FC = () => {
  const {isTokenOpen, close} = useTransferModalContext();
  const {chainId}: Wallet = useWallet();
  const {control, watch} = useForm();
  const {t} = useTranslation();

  const filterValidator = useCallback(
    (token: string[]) => {
      const searchValue = watch('searchToken');
      if (searchValue !== '') {
        const re = new RegExp(searchValue, 'i');
        return token[0].match(re);
      }
      return true;
    },
    [watch]
  );

  const renderResult = () => {
    const tokenList = Object.entries(
      curatedTokens[chainId || 4].curatedTokens
    ).filter(filterValidator);

    return tokenList.length !== 0 ? (
      <>
        <TokenTitle>{t('TokenModal.yourTokens')}</TokenTitle>
        {tokenList.map(([name, address]) => (
          <TokenBox
            tokenName={name}
            tokenAddress={address}
            tokenLogo={
              'https://assets.coingecko.com/coins/images/681/small/JelZ58cv_400x400.png?1601449653'
            }
            key={address}
          />
        ))}
      </>
    ) : (
      <NoTokenWrapper>
        <TokenTitle>{t('TokenModal.tokenNotFoundTitle')}</TokenTitle>
        <TokenSubtitle>{t('TokenModal.tokenNotFoundSubtitle')}</TokenSubtitle>
      </NoTokenWrapper>
    );
  };

  //TODO: tokenLogo should be automate using coinkego api
  //TODO: Cross Icon should added in the next released
  return (
    <Modal
      open={isTokenOpen}
      onClose={() => close('token')}
      data-testid="TokenMenu"
    >
      <Container>
        <Controller
          render={({field: {onChange, value}}) => (
            <SearchInput
              {...{value, onChange}}
              placeholder="Type to filter ..."
            />
          )}
          name="searchToken"
          defaultValue={''}
          control={control}
        />
        <TokensWrapper>{renderResult()}</TokensWrapper>
        <WideButton
          mode="secondary"
          size="large"
          label="Add Custom Token"
          iconLeft={<IconAdd />}
        />
      </Container>
    </Modal>
  );
};

export default TokenMenu;

const Container = styled.div.attrs({
  className: 'space-y-3',
})``;

const TokensWrapper = styled.div.attrs({
  className: 'space-y-1 mt-1',
})``;

const TokenTitle = styled.h2.attrs({
  className: 'text-base font-bold',
})``;

const TokenSubtitle = styled.h2.attrs({
  className: 'text-sm',
})``;

const WideButton = styled(ButtonText).attrs({
  className: 'w-full justify-center',
})``;

const NoTokenWrapper = styled.div.attrs({
  className: 'space-y-0.5',
})``;
