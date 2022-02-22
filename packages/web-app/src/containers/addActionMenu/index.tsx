import React from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {ActionListItem, IconChevronRight} from '@aragon/ui-components';

import {useGlobalModalContext} from 'context/globalModals';
import ModalBottomSheetSwitcher from 'components/modalBottomSheetSwitcher';

export enum AddActionItems {
  ADD_REMOVE_TOKENS = 'ADD_REMOVE_TOKENS',
  MINT_TOKENS = 'MINT_TOKENS',
  WITHDRAW_ASSETS = 'WITHDRAW_ASSETS',
  EXTERNAL_CONTRACT = 'EXTERNAL_CONTRACT',
}

type AddActionMenuProps = {
  onActionSelect: (AddActionItems: AddActionItems) => void;
};

const AddActionMenu: React.FC<AddActionMenuProps> = ({onActionSelect}) => {
  const {isAddActionOpen, close} = useGlobalModalContext();
  const {t} = useTranslation();

  return (
    <ModalBottomSheetSwitcher
      isOpen={isAddActionOpen}
      onClose={() => close('addAction')}
      title={t('AddActionModal.title')}
    >
      <Container>
        <ActionListItem
          title={t('AddActionModal.addRemoveAddresses')}
          subtitle={t('AddActionModal.addRemoveAddressesSubtitle')}
          icon={<IconChevronRight />}
          onClick={() => onActionSelect(AddActionItems.ADD_REMOVE_TOKENS)}
        />
        <ActionListItem
          title={t('AddActionModal.mintTokens')}
          subtitle={t('AddActionModal.mintTokensSubtitle')}
          icon={<IconChevronRight />}
          onClick={() => onActionSelect(AddActionItems.MINT_TOKENS)}
        />
        <ActionListItem
          title={t('AddActionModal.withdrawAssets')}
          subtitle={t('AddActionModal.withdrawAssetsSubtitle')}
          icon={<IconChevronRight />}
          onClick={() => onActionSelect(AddActionItems.WITHDRAW_ASSETS)}
        />
        <ActionListItem
          title={t('AddActionModal.externalContract')}
          subtitle={t('AddActionModal.externalContractSubtitle')}
          icon={<IconChevronRight />}
          onClick={() => onActionSelect(AddActionItems.EXTERNAL_CONTRACT)}
        />
      </Container>
    </ModalBottomSheetSwitcher>
  );
};

export default AddActionMenu;

const Container = styled.div.attrs({
  className: 'space-y-1.5 p-3',
})``;
