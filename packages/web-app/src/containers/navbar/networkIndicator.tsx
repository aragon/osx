import React from 'react';
import {AlertBanner} from '@aragon/ui-components';
import {useTranslation} from 'react-i18next';

import {NetworkIndicatorStatus} from 'utils/types';

type IndicatorProps = {
  status?: NetworkIndicatorStatus;
};

const NetworkIndicator: React.FC<IndicatorProps> = ({status = 'default'}) => {
  const {t} = useTranslation();

  switch (status) {
    case 'testnet':
      return <AlertBanner label={t('alert.testNet')} />;
    case 'unsupported':
      return <AlertBanner label={t('alert.unsupportedNet')} mode="critical" />;
    default:
      return null;
  }
};

export default NetworkIndicator;
