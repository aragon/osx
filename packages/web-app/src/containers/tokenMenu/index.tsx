import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import React, {useCallback, useState} from 'react';
import {Modal, SearchInput, ButtonText, IconAdd} from '@aragon/ui-components';

import TokenBox from './tokenBox';

import {formatUnits} from 'utils/library';
import {useTokenInfo} from 'hooks/useTokenInformation';
import {useTransferModalContext} from 'context/transfersModal';
import {BaseTokenInfo, TokenBalance} from 'utils/types';

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
  const {isTokenOpen, close} = useTransferModalContext();
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
        return token.name.match(re) || token.symbol.match(re);
      }
      return true;
    },
    [searchValue]
  );

  const renderTokens = () => {
    const tokenList = tokens.filter(filterValidator);

    return tokenList.length !== 0 ? (
      <>
        {tokenList.map(token => (
          <div key={token.address} onClick={() => handleTokenClick(token)}>
            <TokenBox
              tokenName={token.name}
              tokenLogo={token.imgUrl}
              tokenSymbol={token.symbol}
              tokenBalance={formatUnits(token.count, token.decimals)}
            />
          </div>
        ))}
      </>
    ) : (
      <>
        <NoTokenWrapper>
          <TokenTitle>
            {isWallet
              ? t('TokenModal.tokenNotFoundTitle')
              : t('TokenModal.noTokens')}
          </TokenTitle>
          {isWallet && (
            <TokenSubtitle>
              {t('TokenModal.tokenNotFoundSubtitle')}
            </TokenSubtitle>
          )}
        </NoTokenWrapper>
      </>
    );
  };

  /*************************************************
   *                    Render                     *
   *************************************************/
  //TODO: Cross Icon should added in the next released
  return (
    <Modal
      open={isTokenOpen}
      onClose={() => close('token')}
      data-testid="TokenMenu"
    >
      <Container>
        <SearchInput
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          placeholder={t('placeHolders.searchTokens')}
        />
        <TokensWrapper>{renderTokens()}</TokensWrapper>
        {isWallet && (
          <WideButton
            mode="secondary"
            size="large"
            label="Add Custom Token"
            iconLeft={<IconAdd />}
            onClick={() =>
              handleTokenClick({...customToken, symbol: searchValue})
            }
          />
        )}
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
  className: 'space-y-0.5 mb-3',
})``;
