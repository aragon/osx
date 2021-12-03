import React from 'react';
import styled from 'styled-components';

import {Badge} from '../badge';

// TODO: implement image fallback (@rollup/plugin-image); @see https://github.com/jaredpalmer/tsdx/issues/379#issuecomment-568239477
// import FallbackImg from '../../assets/avatar-token.svg';

// TODO: change types accordingly
export type TokenCardProps = {
  tokenName: string;
  tokenSymbol: string;
  tokenImageUrl: string;
  treasurySharePercentage: string;
  tokenCount: string;
  tokenUSDValue: string;
  treasuryShare: string;
  changeDuringInterval: string;
  percentageChangeDuringInterval: string;
};

export const TokenCard: React.FC<TokenCardProps> = props => {
  return (
    <Card data-testid="tokenCard">
      <CoinDetailsWithImage>
        {/* <CoinImage
          src={props.tokenImageUrl}
          onError={(e: SyntheticEvent<HTMLImageElement, Event>) => {
            e.currentTarget.src = FallbackImg;
          }}
        /> */}
        <CoinImage src={props.tokenImageUrl} />
        <CoinDetails>
          <CoinNameAndAllocation>
            <CoinName>{props.tokenName}</CoinName>
            <ToggleMobileVisibility visible={false}>
              <Badge label={props.treasurySharePercentage} />
            </ToggleMobileVisibility>
          </CoinNameAndAllocation>
          <SecondaryCoinDetails>
            <span>
              {props.tokenCount} {props.tokenSymbol}
            </span>
            <ToggleMobileVisibility visible={false}>
              <span>•</span>
              <span>{` ${props.tokenUSDValue}`}</span>
            </ToggleMobileVisibility>
          </SecondaryCoinDetails>
        </CoinDetails>
      </CoinDetailsWithImage>
      <MarketProperties>
        <FiatValue>{props.treasuryShare}</FiatValue>
        <SecondaryFiatDetails>
          <ToggleMobileVisibility visible={false}>
            <span>{props.changeDuringInterval}</span>
          </ToggleMobileVisibility>
          <Badge
            label={props.percentageChangeDuringInterval}
            colorScheme="success"
          />
        </SecondaryFiatDetails>
      </MarketProperties>
    </Card>
  );
};

const Card = styled.div.attrs({
  className: 'bg-ui-0 rounded-xl flex justify-between items-center py-2.5 px-3',
})``;

const CoinDetailsWithImage = styled.div.attrs({
  className: 'flex items-center',
})``;

const CoinImage = styled.img.attrs(({src}) => ({
  className: 'w-3 h-3 lg:h-5 lg:w-5 rounded-full',
  src,
}))``;

const CoinDetails = styled.div.attrs({
  className: 'ml-2 space-y-1 overflow-hidden',
})``;

const CoinNameAndAllocation = styled.div.attrs({
  className: 'flex items-center space-x-1',
})``;

const CoinName = styled.h1.attrs({
  className: 'text-xl font-semibold text-ui-800 truncate',
})``;

const SecondaryCoinDetails = styled.div.attrs({
  className: 'text-sm text-ui-500 space-x-0.5',
})``;

const MarketProperties = styled.div.attrs({
  className: 'text-right space-y-1 overflow-hidden',
})``;

const FiatValue = styled.h1.attrs({
  className: 'text-xl font-semibold text-ui-800 truncate',
})``;

const SecondaryFiatDetails = styled.div.attrs({
  className:
    'text-sm text-ui-500 space-x-1 flex justify-end items-center truncate',
})``;

type ToggleMobileVisibilityProps = {
  visible: boolean;
};

const ToggleMobileVisibility: React.FC<ToggleMobileVisibilityProps> = ({
  visible,
  children,
}) => {
  return (
    <div
      className={
        visible ? 'inline-block tablet:hidden' : 'hidden tablet:inline-block'
      }
    >
      {children}
    </div>
  );
};
