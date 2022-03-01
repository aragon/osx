import React from 'react';
import {useTranslation} from 'react-i18next';
import {ButtonText, IconChevronRight} from '@aragon/ui-components';
import CardWithImage from 'components/cardWithImage';
import {useFormStep} from 'components/fullScreenStepper';
import SelectBlockchain from 'public/selectBlockchain.svg';
import DefineMetadata from 'public/defineMetadata.svg';
import SetupCommunity from 'public/setupCommunity.svg';
import ConfigureGovernance from 'public/configureGovernance.svg';

export const OverviewDAOHeader: React.FC = () => {
  const {t} = useTranslation();

  return (
    <div className="p-6 bg-ui-0 tablet:rounded-xl">
      <h1 className="text-3xl font-bold text-ui-800">
        {t('createDAO.overview.title')}
      </h1>
      <p className="mt-2 text-lg text-ui-600">
        {t('createDAO.overview.description')}
      </p>
    </div>
  );
};

export const OverviewDAOStep: React.FC = () => {
  const {t} = useTranslation();

  return (
    <div className="tablet:flex space-y-3 tablet:space-y-0 tablet:space-x-3">
      <CardWithImage
        imgSrc={SelectBlockchain}
        caption={t('createDAO.step1.label')}
        title={t('createDAO.step1.title')}
        subtitle={t('createDAO.step1.description')}
      />
      <CardWithImage
        imgSrc={DefineMetadata}
        caption={t('createDAO.step2.label')}
        title={t('createDAO.step2.title')}
        subtitle={t('createDAO.step2.description')}
      />
      <CardWithImage
        imgSrc={SetupCommunity}
        caption={t('createDAO.step3.label')}
        title={t('createDAO.step3.title')}
        subtitle={t('createDAO.step3.description')}
      />
      <CardWithImage
        imgSrc={ConfigureGovernance}
        caption={t('createDAO.step4.label')}
        title={t('createDAO.step4.title')}
        subtitle={t('createDAO.step4.description')}
      />
    </div>
  );
};

export const OverviewDAOFooter: React.FC = () => {
  const {next} = useFormStep();
  const {t} = useTranslation();

  return (
    <div className="flex justify-center pt-3">
      <ButtonText
        size="large"
        iconRight={<IconChevronRight />}
        label={t('createDAO.overview.button')}
        onClick={next}
      />
    </div>
  );
};
