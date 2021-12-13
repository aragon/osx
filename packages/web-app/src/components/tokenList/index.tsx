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

// Note: Temporary until historical data can be fetched
const TokenList: React.FC<TokenListProps> = ({prices, tokens}) => {
  const {t} = useTranslation();
  let price;

  if (tokens.length === 0)
    return <p data-testid="tokenList">No token information available.</p>;

  return (
    <div className="space-y-2" data-testid="tokenList">
      {tokens
        .sort(
          (a, b) =>
            Number(b.treasurySharePercentage) -
            Number(a.treasurySharePercentage)
        )
        .map(token => {
          price = prices[token.address];
          return (
            <TokenCard
              key={token.name}
              tokenName={token.name}
              tokenCount={numberFormatter.format(Number(token.count))}
              tokenSymbol={token.symbol}
              tokenImageUrl={token.imgUrl}
              {...(price
                ? {
                    tokenUSDValue: usdFormatter.format(Number(price)),
                    treasurySharePercentage: `${token.treasurySharePercentage}%`,
                    percentageChangeDuringInterval:
                      token.percentageChangeDuringInterval,

                    treasuryShare: usdFormatter.format(
                      Number(price) * token.count
                    ),
                    changeType:
                      Number(token.changeDuringInterval) > 0
                        ? 'Positive'
                        : 'Negative',
                    changeDuringInterval: token.changeDuringInterval
                      ? usdFormatter.format(token.changeDuringInterval)
                      : undefined,
                  }
                : {
                    tokenUSDValue: t('finance.unknownUSDValue'),
                    treasuryShare: t('finance.unknownUSDValue'),
                  })}
            />
          );
        })}
    </div>
  );
};

export default TokenList;
