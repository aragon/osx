import {
  SearchInput,
  ButtonText,
  IconAdd,
  IconStorage,
} from '@aragon/ui-components';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import React, {useCallback, useState} from 'react';

import TokenBox from './tokenBox';
import {sortTokens} from 'utils/tokens';
import {formatUnits} from 'utils/library';
import {useTokenInfo} from 'hooks/useTokenInformation';
import {useGlobalModalContext} from 'context/globalModals';
import {BaseTokenInfo, TokenBalance} from 'utils/types';
import ModalBottomSheetSwitcher from 'components/modalBottomSheetSwitcher';

const customToken = {
  address: '',
  count: BigInt(0),
  decimals: 18,
  imgUrl: '',
  symbol: '',
  name: '',
};

type TokenMenuProps = {
  isWallet?: boolean;
  tokenBalances: TokenBalance[];
  onTokenSelect: (token: BaseTokenInfo) => void;
};

const TokenMenu: React.FC<TokenMenuProps> = ({
  isWallet = true,
  tokenBalances,
  onTokenSelect,
}) => {
  const {t} = useTranslation();
  const {data: tokens} = useTokenInfo(tokenBalances);
  const {isTokenOpen, close} = useGlobalModalContext();
  const [searchValue, setSearchValue] = useState('');

  /*************************************************
   *             Functions and Handlers            *
   *************************************************/
  const handleTokenClick = (token: BaseTokenInfo) => {
    onTokenSelect(token);
    close('token');
  };

  const filterValidator = useCallback(
    (token: BaseTokenInfo) => {
      if (searchValue !== '') {
        const re = new RegExp(searchValue, 'i');
        return token?.name?.match(re) || token?.symbol?.match(re);
      }
      return true;
    },
    [searchValue]
  );

  const renderTokens = () => {
    const tokenList = tokens.filter(filterValidator);
    sortTokens(tokenList, 'name');

    if (tokenList.length === 0 && searchValue === '') {
      return (
        <>
          <NoTokenContainer>
            <IconWrapper>
              <IconStorage height={24} width={24} />
            </IconWrapper>
            <TokenTitle>{t('TokenModal.tokenNotAvailable')}</TokenTitle>
            <TokenDescription>
              {isWallet
                ? t('TokenModal.tokenNotAvailableSubtitle')
                : t('TokenModal.tokenNotAvailableSubtitleDao')}
            </TokenDescription>
          </NoTokenContainer>
        </>
      );
    } else if (tokenList.length === 0) {
      return (
        <>
          <NoTokenWrapper>
            <TokenTitle>{t('TokenModal.tokenNotFoundTitle')}</TokenTitle>
            <TokenSubtitle>
              {isWallet
                ? t('TokenModal.tokenNotFoundSubtitle')
                : t('TokenModal.tokenNotFoundSubtitleDao')}
            </TokenSubtitle>
          </NoTokenWrapper>
        </>
      );
    } else {
      return (
        <>
          {tokenList.map(token => (
            <div key={token.address} onClick={() => handleTokenClick(token)}>
              <TokenBox
                tokenName={token.name}
                tokenLogo={token.imgUrl}
                tokenSymbol={token.symbol}
                tokenBalance={formatUnits(token.count, token.decimals).slice(
                  0,
                  6
                )}
              />
            </div>
          ))}
        </>
      );
    }
  };

  /*************************************************
   *                    Render                     *
   *************************************************/
  //TODO: Cross Icon should added in the next released
  return (
    <ModalBottomSheetSwitcher
      isOpen={isTokenOpen}
      onClose={() => close('token')}
      data-testid="TokenMenu"
    >
      <Container>
        <SearchInput
          value={searchValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearchValue(e.target.value)
          }
          placeholder={t('placeHolders.searchTokens')}
        />
        <TokensWrapper>{renderTokens()}</TokensWrapper>
        <WideButton
          mode="secondary"
          size="large"
          label="Add Custom Token"
          iconLeft={<IconAdd />}
          onClick={() =>
            handleTokenClick({...customToken, symbol: searchValue})
          }
        />
      </Container>
    </ModalBottomSheetSwitcher>
  );
};

export default TokenMenu;

const Container = styled.div.attrs({
  className: 'space-y-3 p-3',
})``;

const TokensWrapper = styled.div.attrs({
  className: 'space-y-1 mt-1',
})``;

const TokenTitle = styled.h2.attrs({
  className: 'text-base font-bold',
})``;

const TokenSubtitle = styled.h2.attrs({
  className: 'text-sm text-ui-600',
})``;

const TokenDescription = styled.h2.attrs({
  className: 'text-sm text-center text-ui-600',
})``;

const WideButton = styled(ButtonText).attrs({
  className: 'w-full justify-center',
})``;

const NoTokenWrapper = styled.div.attrs({
  className: 'space-y-0.5 mb-3',
})``;

const NoTokenContainer = styled.div.attrs({
  className: `flex flex-col items-center mb-3
    justify-center bg-ui-100 py-3 px-2 rounded-xl`,
})``;

const IconWrapper = styled.div.attrs({
  className: 'mb-1.5',
})``;
