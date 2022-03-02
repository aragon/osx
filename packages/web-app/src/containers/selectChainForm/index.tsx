import {
  ButtonText,
  IconChevronDown,
  Label,
  ListItemAction,
  ListItemBlockchain,
  Popover,
} from '@aragon/ui-components';
import styled from 'styled-components';
import {chains} from 'use-wallet';
import {useTranslation} from 'react-i18next';
import {Controller, useFormContext} from 'react-hook-form';
import React, {useCallback, useState} from 'react';

import {i18n} from '../../../i18n.config';
import useScreen from 'hooks/useScreen';
import {useWallet} from 'context/augmentedWallet';
import {CHAIN_METADATA} from 'utils/constants';

type NetworkType = 'main' | 'test';
type SortFilter = 'cost' | 'popularity' | 'security';

function getNetworkType(id: number | undefined) {
  if (!id) return 'main';

  try {
    return chains.getChainInformation(id).testnet ? 'test' : 'main';
  } catch (error) {
    console.error('Unknown chain, defaulting to main', error);
    return 'main';
  }
}

const SelectChainForm: React.FC = () => {
  const {t} = useTranslation();
  const {isMobile} = useScreen();
  const {account, chainId, networkName} = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const {control, getValues} = useFormContext();
  const [sortFilter, setFilter] = useState<SortFilter>('cost');
  const [networkType, setNetworkType] = useState<NetworkType>(
    () => getValues('blockchain')?.network || getNetworkType(chainId)
  );

  const handleFilterChanged = useCallback(
    (e: React.MouseEvent) => {
      setIsOpen(false);
      const {name} = e.currentTarget as HTMLButtonElement;

      if (sortFilter !== name) {
        setFilter(name as SortFilter);
      }
    },
    [sortFilter]
  );

  return (
    <>
      <Header>
        <NetworkTypeSwitcher>
          <ButtonText
            mode="secondary"
            size={isMobile ? 'small' : 'medium'}
            label={t('labels.mainNet')}
            isActive={networkType === 'main'}
            onClick={() => setNetworkType('main')}
          />
          <ButtonText
            mode="secondary"
            size={isMobile ? 'small' : 'medium'}
            label={t('labels.testNet')}
            isActive={networkType === 'test'}
            onClick={() => setNetworkType('test')}
          />
        </NetworkTypeSwitcher>
        <SortFilter>
          {!isMobile && <Label label={t('labels.sortBy')} />}
          {/* TODO: replace with proper dropdown */}
          <Popover
            side="bottom"
            open={isOpen}
            align="start"
            width={264}
            onOpenChange={(value: boolean) => setIsOpen(value)}
            content={
              <DropdownContent>
                <ListItemAction
                  name="cost"
                  mode={sortFilter === 'cost' ? 'selected' : 'default'}
                  title={t('labels.networkCost')}
                  onClick={handleFilterChanged}
                  bgWhite
                />
                <ListItemAction
                  name="popularity"
                  mode={sortFilter === 'popularity' ? 'selected' : 'default'}
                  title={t('labels.popularity')}
                  onClick={handleFilterChanged}
                  bgWhite
                />
                <ListItemAction
                  name="security"
                  mode={sortFilter === 'security' ? 'selected' : 'default'}
                  title={t('labels.security')}
                  onClick={handleFilterChanged}
                  bgWhite
                />
              </DropdownContent>
            }
          >
            <ButtonText
              label={labels[sortFilter].title}
              mode="secondary"
              size={isMobile ? 'small' : 'large'}
              isActive={isOpen}
              iconRight={<IconChevronDown />}
            />
          </Popover>
        </SortFilter>
      </Header>
      <FormItem>
        {networks[networkType][sortFilter].map(({id, name, ...rest}, index) => (
          <Controller
            key={id}
            name="blockchain"
            rules={{required: true}}
            control={control}
            defaultValue={{
              id: (account && chainId) || 1,
              label: (account && networkName) || 'Ethereum',
              network: networkType,
            }}
            render={({field}) => (
              <ListItemBlockchain
                onClick={() =>
                  field.onChange({id: id, label: name, network: networkType})
                }
                selected={id === field.value.id}
                {...{name}}
                {...(index === 0 ? {tag: labels[sortFilter].tag} : {})}
                {...rest}
              />
            )}
          />
        ))}
      </FormItem>
    </>
  );
};

export default SelectChainForm;

const Header = styled.div.attrs({className: 'flex justify-between'})``;

const NetworkTypeSwitcher = styled.div.attrs({
  className: 'flex p-0.5 space-x-0.25 bg-ui-0 rounded-xl',
})``;

const SortFilter = styled.div.attrs({
  className: 'flex items-center space-x-1.5',
})``;

const FormItem = styled.div.attrs({
  className: 'space-y-1.5',
})``;

const DropdownContent = styled.div.attrs({className: 'p-1.5 space-y-0.5'})``;

const labels = {
  cost: {tag: i18n.t('labels.cheapest'), title: i18n.t('labels.networkCost')},
  popularity: {
    tag: i18n.t('labels.mostPopular'),
    title: i18n.t('labels.popularity'),
  },
  security: {
    tag: i18n.t('labels.safest'),
    title: i18n.t('labels.security'),
  },
};

// Note: Default Network name in polygon network is different than Below list
const networks = {
  main: {
    cost: [
      CHAIN_METADATA.main[137], //polygon
      CHAIN_METADATA.main[42161], //arbitrum
      CHAIN_METADATA.main[1], //ethereum
    ],
    popularity: [
      CHAIN_METADATA.main[137], //polygon
      CHAIN_METADATA.main[1], //ethereum
      CHAIN_METADATA.main[42161], //arbitrum
    ],
    security: [
      CHAIN_METADATA.main[1], //ethereum
      CHAIN_METADATA.main[42161], //arbitrum
      CHAIN_METADATA.main[137], //polygon
    ],
  },
  test: {
    cost: [
      CHAIN_METADATA.test[80001], //mumbai
      CHAIN_METADATA.test[421611], //arbitrum
      CHAIN_METADATA.test[4], //ethereum
    ],
    popularity: [
      CHAIN_METADATA.test[80001], //mumbai
      CHAIN_METADATA.test[4], //ethereum
      CHAIN_METADATA.test[421611], //arbitrum
    ],
    security: [
      CHAIN_METADATA.test[4], //ethereum
      CHAIN_METADATA.test[421611], //arbitrum
      CHAIN_METADATA.test[80001], //Mumbai
    ],
  },
};
