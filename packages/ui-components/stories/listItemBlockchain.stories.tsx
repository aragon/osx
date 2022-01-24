import {Meta} from '@storybook/react';
import React, {useState} from 'react';

import {ListItemBlockchain} from '../src/components/listItem';

export default {
  title: 'Components/ListItem/Blockchain',
  component: ListItemBlockchain,
} as Meta;

// This story does not contain controls, purposefully
export const Default = () => {
  const [selectedIndex, setIndex] = useState<number>(1);

  const handleOnClick = (index: number) => {
    if (index !== selectedIndex) setIndex(index);
  };

  return chains.map((chain, index) => (
    <ListItemBlockchain
      {...chain}
      key={index}
      onClick={() => handleOnClick(index)}
      selected={index === selectedIndex}
    />
  ));
};

const chains = [
  {
    name: 'Arbitrum',
    domain: 'L2 Blockchain',
    tag: 'cheapest',
    logo: 'https://bridge.arbitrum.io/logo.png',
  },
  {
    name: 'Ethereum',
    domain: 'L1 Blockchain',
    tag: 'most secure',
    logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1595348880',
  },
  {
    name: 'Polygon',
    domain: 'L2 Blockchain',
    logo: 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png?1624446912',
  },
];
