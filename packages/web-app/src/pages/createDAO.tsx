import React from 'react';
import {withTransaction} from '@elastic/apm-rum-react';
import {useTranslation} from 'react-i18next';
import {FormProvider, useForm} from 'react-hook-form';
import {FullScreenStepper, Step} from 'components/fullScreenStepper';
import {
  OverviewDAOFooter,
  OverviewDAOHeader,
  OverviewDAOStep,
} from 'containers/daoOverview';
import SelectChain from 'containers/selectChainForm';
import DefineMetadata from 'containers/defineMetadata';
import ConfigureCommunity from 'containers/configureCommunity';
import SetupCommunity from 'containers/setupCommunity';

type FormData = {
  links: {label: string; link: string}[];
};

const defaultValues = {
  links: [{label: '', link: ''}],
};

const CreateDAO: React.FC = () => {
  const {t} = useTranslation();
  const formMethods = useForm<FormData>({mode: 'onChange', defaultValues});

  return (
    <FormProvider {...formMethods}>
      <FullScreenStepper
        navbarBackUrl="/"
        navbarLabel={t('createDAO.title')}
        totalFormSteps={4}
        wizardProcessName={t('createDAO.title')}
      >
        <Step
          hideWizard
          fullWidth
          customHeader={<OverviewDAOHeader />}
          customFooter={<OverviewDAOFooter />}
        >
          <OverviewDAOStep />
        </Step>
        <Step
          wizardTitle={t('createDAO.step1.title')}
          wizardDescription={t('createDAO.step1.description')}
        >
          <SelectChain />
        </Step>
        <Step
          wizardTitle={t('createDAO.step2.title')}
          wizardDescription={t('createDAO.step2.description')}
        >
          <DefineMetadata />
        </Step>
        <Step
          wizardTitle={t('createDAO.step3.title')}
          wizardDescription={t('createDAO.step3.description')}
        >
          <SetupCommunity />
        </Step>
        <Step
          wizardTitle={t('createDAO.step4.title')}
          wizardDescription={t('createDAO.step4.description')}
        >
          <ConfigureCommunity />
        </Step>
      </FullScreenStepper>
    </FormProvider>
  );
};

export default withTransaction('CreateDAO', 'component')(CreateDAO);
