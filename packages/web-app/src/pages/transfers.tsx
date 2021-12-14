import React from 'react';
import {withTransaction} from '@elastic/apm-rum-react';
import {useTranslation} from 'react-i18next';

import {useTransferModalContext} from 'context/transfersModal';
import {PageWrapper} from 'components/wrappers';

const Transfers: React.FC = () => {
  const {t} = useTranslation();
  const {open} = useTransferModalContext();

  return (
    <div className={'m-auto mt-4 w-8/12'}>
      <PageWrapper
        title={t('TransferModal.allTransfers') as string}
        buttonLabel={t('TransferModal.newTransfer') as string}
        subtitle={'$1,002,200.00 Total Volume'}
        onClick={open}
      >
        <div></div>
      </PageWrapper>
    </div>
  );
};

export default withTransaction('Transfers', 'component')(Transfers);
