import React from 'react';
import {TransferListItem} from '@aragon/ui-components';
import {useTranslation} from 'react-i18next';
import {Transfers} from 'utils/types';

// types might come from subgraph - not adding any now
type TransferListProps = {
  transfers: Array<Transfers>;
};

const TransferList: React.FC<TransferListProps> = ({transfers}) => {
  const {t} = useTranslation();

  if (transfers.length === 0)
    return <p data-testid="transferList">{t('finance.noTransfers')}</p>;

  return (
    <div className="space-y-2" data-testid="transferList">
      {transfers.map((transfer, index) => {
        // key should be changed later
        return <TransferListItem key={index} {...transfer} />;
      })}
    </div>
  );
};

export default TransferList;
