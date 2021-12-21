import React from 'react';
import {TokenCard} from '@aragon/ui-components';
import {formatUnits} from 'ethers/lib/utils';
import {useTranslation} from 'react-i18next';

import {TreasuryToken} from 'utils/types';

type TokenListProps = {
  tokens: TreasuryToken[];
};

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 4,
});

// TODO: Pass in current locale to usd value
const TokenList: React.FC<TokenListProps> = ({tokens}) => {
  const {t} = useTranslation();

  if (tokens.length === 0)
    return <p data-testid="tokenList">No token information available.</p>;

  return (
    <div className="space-y-1.5" data-testid="tokenList">
      {tokens.map(token => (
        <TokenCard
          key={token.address}
          tokenName={token.name}
          tokenCount={numberFormatter.format(
            Number(formatUnits(token.count, token.decimals))
          )}
          tokenSymbol={token.symbol}
          tokenImageUrl={token.imgUrl}
          {...(token.price &&
          token.treasuryShare &&
          token.changeDuringInterval &&
          token.percentageChangeDuringInterval
            ? {
                tokenUSDValue: usdFormatter.format(token.price),
                treasuryShare: usdFormatter.format(token.treasuryShare),
                treasurySharePercentage:
                  token.treasurySharePercentage?.toFixed(0) + '%',

                // Percentage change during given interval
                percentageChangeDuringInterval:
                  new Intl.NumberFormat('en-US', {
                    signDisplay: 'always',
                    maximumFractionDigits: 2,
                  }).format(token.percentageChangeDuringInterval) + '%',

                // Change during interval in currency
                changeDuringInterval: new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  signDisplay: 'always',
                }).format(token.changeDuringInterval),

                // Type of change during interval
                changeType:
                  token.changeDuringInterval > 0 ? 'Positive' : 'Negative',
              }
            : {
                tokenUSDValue: t('finance.unknownUSDValue'),
                treasuryShare: t('finance.unknownUSDValue'),
              })}
        />
      ))}
    </div>
  );
};

export default TokenList;
