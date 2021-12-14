import React from 'react';
import {TokenCard} from '@aragon/ui-components';
import {useTranslation} from 'react-i18next';

import {BaseTokenInfo} from 'utils/types';

type TokenListProps = {
  tokens: BaseTokenInfo[];
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

  if (tokens.length === 0)
    return <p data-testid="tokenList">No token information available.</p>;

  return (
    <div className="space-y-1.5" data-testid="tokenList">
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

// NOTE this code was taken from the chore/update-button PR and replaced by the
// above due to merge conflicts. I have tried to reconsile this incoming change
// with the current (instead of replacing it), but was unsuccessful due to a
// type conflict on TokenCard. Saveguarding it to avoid having to go and find it
// in the depths of git braches.

// @Fabrice: I would treat a list of tokens as a presentational component,
// leaving it to a parent container to do any sorting or filtering. Wdyt?

// {
//   tokens
//     .sort(
//       (a, b) =>
//         Number(b.treasurySharePercentage) - Number(a.treasurySharePercentage)
//     )
//     .map(token => {
//       price = prices[token.address];
//       return (
//         <TokenCard
//           key={token.name}
//           tokenName={token.name}
//           tokenCount={numberFormatter.format(Number(token.count))}
//           tokenSymbol={token.symbol}
//           tokenImageUrl={token.imgUrl}
//           {...(price
//             ? {
//                 tokenUSDValue: usdFormatter.format(Number(price)),
//                 treasurySharePercentage: `${token.treasurySharePercentage}%`,
//                 percentageChangeDuringInterval:
//                   token.percentageChangeDuringInterval,

//                 treasuryShare: usdFormatter.format(Number(price) * token.count),
//                 changeType:
//                   Number(token.changeDuringInterval) > 0
//                     ? 'Positive'
//                     : 'Negative',
//                 changeDuringInterval: token.changeDuringInterval
//                   ? usdFormatter.format(token.changeDuringInterval)
//                   : undefined,
//               }
//             : {
//                 tokenUSDValue: t('finance.unknownUSDValue'),
//                 treasuryShare: t('finance.unknownUSDValue'),
//               })}
//         />
//       );
//     });
