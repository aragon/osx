import React, {useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {withTransaction} from '@elastic/apm-rum-react';
import {useForm, FormProvider} from 'react-hook-form';
import {constants} from 'ethers';

import {FullScreenStepper, Step} from 'components/fullScreenStepper';
import SetupVotingForm from 'containers/setupVotingForm';
import DefineProposal from 'containers/defineProposal';
import ConfigureActions from 'containers/configureActions';
import AddActionMenu from 'containers/addActionMenu';

import {useWallet} from 'context/augmentedWallet';
import {useWalletProps} from 'containers/walletMenu';
import {TransferTypes} from 'utils/constants';
import {ActionsProvider} from 'context/actions';

const NewProposal: React.FC = () => {
  const {t} = useTranslation();
  const formMethods = useForm({
    mode: 'onChange',
  });
  const {account}: useWalletProps = useWallet();

  useEffect(() => {
    if (account) {
      // TODO: Change from to proper address
      formMethods.setValue('from', constants.AddressZero);
      formMethods.setValue('type', TransferTypes.Withdraw);
    }
  }, [account, formMethods]);

  /*************************************************
   *                    Render                     *
   *************************************************/
  return (
    <FormProvider {...formMethods}>
      <ActionsProvider>
        <FullScreenStepper wizardProcessName={t('newProposal.title')}>
          <Step
            wizardTitle={t('newWithdraw.defineProposal.heading')}
            wizardDescription={t('newWithdraw.defineProposal.description')}
          >
            <DefineProposal />
          </Step>
          <Step
            wizardTitle={t('newWithdraw.setupVoting.title')}
            wizardDescription={t('newWithdraw.setupVoting.description')}
          >
            <SetupVotingForm />
          </Step>
          <Step
            wizardTitle={t('newProposal.configureActions.heading')}
            wizardDescription={t('newProposal.configureActions.description')}
          >
            <ConfigureActions />
          </Step>
        </FullScreenStepper>

        <AddActionMenu />
      </ActionsProvider>
      <pre>{JSON.stringify(formMethods.watch(), null, 2)}</pre>
    </FormProvider>
  );
};

export default withTransaction('NewProposal', 'component')(NewProposal);
