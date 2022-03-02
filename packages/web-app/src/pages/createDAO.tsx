import React, {useMemo} from 'react';
import {withTransaction} from '@elastic/apm-rum-react';
import {useTranslation} from 'react-i18next';
import {FormProvider, useForm, useFormState} from 'react-hook-form';

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
import GoLive, {GoLiveHeader, GoLiveFooter} from 'containers/goLive';
import {WalletField} from '../components/addWallets/row';

type FormData = {
  daoLogo: string;
  daoName: string;
  daoSummary: string;
  tokenName: string;
  tokenSymbol: string;
  tokenTotalSupply: number;
  isCustomToken: boolean;
  links: {label: string; link: string}[];
  wallets: WalletField[];
  tokenAddress: string;
  durationMinutes: string;
  durationHours: string;
  durationDays: string;
};

const defaultValues = {
  tokenName: '',
  tokenSymbol: '',
  tokenTotalSupply: 0,
  links: [{label: '', href: ''}],
  wallets: [
    {address: 'DAO Treasury', amount: '0'},
    {address: 'My Wallet', amount: '0'},
  ],
};

const CreateDAO: React.FC = () => {
  const {t} = useTranslation();
  const formMethods = useForm<FormData>({mode: 'onChange', defaultValues});
  const {errors, dirtyFields} = useFormState({control: formMethods.control});
  const [isCustomToken, tokenTotalSupply] = formMethods.getValues([
    'isCustomToken',
    'tokenTotalSupply',
  ]);

  /*************************************************
   *             Step Validation States            *
   *************************************************/
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const daoMetadataIsValid = useMemo(() => {
    // required fields not dirty
    if (!dirtyFields.daoName || !dirtyFields.daoSummary) return false;

    return errors.daoLogo || errors.daoName || errors.links || errors.daoSummary
      ? false
      : true;
  }, [
    dirtyFields.daoName,
    dirtyFields.daoSummary,
    errors.daoLogo,
    errors.daoName,
    errors.daoSummary,
    errors.links,
  ]);

  const daoSetupCommunityIsValid = useMemo(() => {
    // required fields not dirty
    if (isCustomToken === true) {
      if (
        !dirtyFields.tokenName ||
        !dirtyFields.wallets ||
        !dirtyFields.tokenSymbol ||
        errors.wallets ||
        tokenTotalSupply === 0
      )
        return false;
      return errors.tokenName || errors.tokenSymbol || errors.wallets
        ? false
        : true;
    } else {
      if (!dirtyFields.tokenAddress || errors.tokenAddress) return false;
      return true;
    }
  }, [
    dirtyFields.tokenAddress,
    dirtyFields.tokenName,
    dirtyFields.tokenSymbol,
    dirtyFields.wallets,
    errors.tokenAddress,
    errors.tokenName,
    errors.tokenSymbol,
    errors.wallets,
    isCustomToken,
    tokenTotalSupply,
  ]);

  /*************************************************
   *                    Render                     *
   *************************************************/
  return (
    <FormProvider {...formMethods}>
      <FullScreenStepper wizardProcessName={t('createDAO.title')}>
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
          isNextButtonDisabled={!daoMetadataIsValid}
        >
          <DefineMetadata />
        </Step>
        <Step
          wizardTitle={t('createDAO.step3.title')}
          wizardDescription={t('createDAO.step3.description')}
          isNextButtonDisabled={!daoSetupCommunityIsValid}
        >
          <SetupCommunity />
        </Step>
        <Step
          wizardTitle={t('createDAO.step4.title')}
          wizardDescription={t('createDAO.step4.description')}
        >
          <ConfigureCommunity />
        </Step>
        <Step
          hideWizard
          fullWidth
          customHeader={<GoLiveHeader />}
          customFooter={<GoLiveFooter />}
        >
          <GoLive />
        </Step>
      </FullScreenStepper>
    </FormProvider>
  );
};

export default withTransaction('CreateDAO', 'component')(CreateDAO);
