import React from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {ListItemAction, IconChevronRight} from '@aragon/ui-components';

import {useGlobalModalContext} from 'context/globalModals';
import {useActionsContext} from 'context/actions';
import ModalBottomSheetSwitcher from 'components/modalBottomSheetSwitcher';

export enum AddActionItems {
  ADD_REMOVE_ADDRESS = 'add_remove_address',
  MINT_TOKENS = 'mint_token',
  WITHDRAW_ASSETS = 'withdraw_assets',
  EXTERNAL_CONTRACT = 'external_contract',
}

const AddActionMenu: React.FC = () => {
  const {isAddActionOpen, close} = useGlobalModalContext();
  const {addAction} = useActionsContext();
  const {t} = useTranslation();

  return (
    <ModalBottomSheetSwitcher
      isOpen={isAddActionOpen}
      onClose={() => close('addAction')}
      title={t('AddActionModal.title')}
    >
      <Container>
        <ListItemAction
          title={t('AddActionModal.addRemoveAddresses')}
          subtitle={t('AddActionModal.addRemoveAddressesSubtitle')}
          iconRight={<IconChevronRight />}
          onClick={() => alert(AddActionItems.ADD_REMOVE_ADDRESS)}
        />
        <ListItemAction
          title={t('AddActionModal.mintTokens')}
          subtitle={t('AddActionModal.mintTokensSubtitle')}
          iconRight={<IconChevronRight />}
          onClick={() => alert(AddActionItems.MINT_TOKENS)}
        />
        <ListItemAction
          title={t('AddActionModal.withdrawAssets')}
          subtitle={t('AddActionModal.withdrawAssetsSubtitle')}
          iconRight={<IconChevronRight />}
          onClick={() => {
            addAction({
              name: AddActionItems.WITHDRAW_ASSETS,
            });
            close('addAction');
          }}
        />
        <ListItemAction
          title={t('AddActionModal.externalContract')}
          subtitle={t('AddActionModal.externalContractSubtitle')}
          iconRight={<IconChevronRight />}
          onClick={() => alert(AddActionItems.EXTERNAL_CONTRACT)}
        />
      </Container>
    </ModalBottomSheetSwitcher>
  );
};

export default AddActionMenu;

const Container = styled.div.attrs({
  className: 'space-y-1.5 p-3',
})``;
