import React from 'react';
import styled from 'styled-components';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {Modal, ActionListItem, IconChevronRight} from '@aragon/ui-components';

import {useWallet} from 'context/augmentedWallet';
import {NewDeposit} from 'utils/paths';
import {useTransferModalContext} from 'context/transfersModal';

const TransferMenu: React.FC = () => {
  const {isTransferOpen, close} = useTransferModalContext();
  const {t} = useTranslation();
  const navigate = useNavigate();
  const {isConnected} = useWallet();

  const handleNewDepositClick = () => {
    // TODO: change alert to proper error reporting mechanism,
    // Move to proper placing
    if (isConnected()) {
      navigate(NewDeposit);
      close();
    } else alert('Please connect your wallet');
  };

  return (
    <Modal
      open={isTransferOpen}
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
          onClick={handleNewDepositClick}
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
