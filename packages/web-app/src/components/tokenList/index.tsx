import React from 'react';
import {TokenCard} from '@aragon/ui-components';
import {useTranslation} from 'react-i18next';

import {DisplayToken} from 'utils/types';

type TokenListProps = {
  tokens: DisplayToken[];
  prices: {[key: string]: string | undefined};
};

// TODO: consider moving to constants if multiple uses
const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 4,
});

const TokenList: React.FC<TokenListProps> = ({prices, tokens}) => {
  const {t} = useTranslation();

  if (tokens.length === 0)
    return <p data-testid="tokenList">No token information available.</p>;

  return (
    <div className="space-y-2" data-testid="tokenList">
      {tokens.map(token => {
        return (
          <TokenCard
            key={token.name}
            tokenName={token.name}
            tokenCount={numberFormatter.format(token.count)}
            tokenSymbol={token.symbol}
            tokenImageUrl={token.imgUrl}
            changeDuringInterval="+$150,002.3"
            treasurySharePercentage="20%"
            percentageChangeDuringInterval="+ 0.01%"
            tokenUSDValue={
              prices[token.address]
                ? usdFormatter.format(Number(prices[token.address]))
                : t('finance.unknownUSDValue')
            }
            treasuryShare={
              prices[token.address]
                ? usdFormatter.format(
                    Number(prices[token.address]) * token.count
                  )
                : t('finance.unknownUSDValue')
            }
          />
        );
      })}
    </div>
  );
};

export default TokenList;
