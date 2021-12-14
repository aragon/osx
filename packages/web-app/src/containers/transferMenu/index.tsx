import React from 'react';
import styled from 'styled-components';
import {Modal, ActionListItem, IconChevronRight} from '@aragon/ui-components';
import {useTranslation} from 'react-i18next';

import {useTransferModalContext} from 'context/transfersModal';

const TransferMenu: React.FC = () => {
  const {isOpen, close} = useTransferModalContext();
  const {t} = useTranslation();

  return (
    <Modal
      open={isOpen}
      onClose={close}
      title={t('TransferModal.newTransfer') as string}
      data-testid="walletCard"
    >
      <Container>
        <ActionListItem
          title={t('TransferModal.item1Title') as string}
          subtitle={t('TransferModal.item1Subtitle') as string}
          icon={<IconChevronRight />}
          background="white"
          bordered={false}
        />
        <ActionListItem
          title={t('TransferModal.item2Title') as string}
          subtitle={t('TransferModal.item2Subtitle') as string}
          icon={<IconChevronRight />}
          background="white"
          bordered={false}
        />
      </Container>
    </Modal>
  );
};

export default TransferMenu;

const Container = styled.div.attrs({
  className: 'space-y-3 pb-4 pt-1',
})``;
