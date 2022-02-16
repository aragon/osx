import {Address} from '@aragon/ui-components/dist/utils/addresses';
import {constants} from 'ethers';
import {useTranslation} from 'react-i18next';
import {withTransaction} from '@elastic/apm-rum-react';
import {useForm, FormProvider} from 'react-hook-form';
import React, {useEffect} from 'react';

import TokenMenu from 'containers/tokenMenu';
import {useWallet} from 'context/augmentedWallet';
import {formatUnits} from 'utils/library';
import {useDaoTokens} from 'hooks/useDaoTokens';
import {BaseTokenInfo} from 'utils/types';
import {TransferTypes} from 'utils/constants';
import {useWalletProps} from 'containers/walletMenu';
import ConfigureWithdrawForm from 'containers/configureWithdraw';
import {FullScreenStepper, Step} from 'components/fullScreenStepper';
import SetupVotingForm from 'containers/setupVotingForm';
import DefineProposal from 'containers/defineProposal';

export type TransferData = {
  amount: string;
  from: Address;
  to: Address;
  reference?: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  duration: number;
  startUtc: string;
  endUtc: string;
};

export type TokenFormData = {
  tokenName: string;
  tokenSymbol: string;
  tokenImgUrl: string;
  tokenAddress: Address;
  tokenBalance: string;
};

export type TransferFormData = TransferData &
  TokenFormData & {
    isCustomToken: boolean;
    type: TransferTypes;
  };

export type WithdrawFormData = TransferFormData & {
  // NOTE: Is this really just a withdrawl thing?
  tokenDecimals: number;
};

const defaultValues = {
  to: '0x8367dc645e31321CeF3EeD91a10a5b7077e21f70',
  amount: '',
  reference: '',
  tokenAddress: '',
  tokenSymbol: '',
  tokenName: '',
  tokenImgUrl: '',
  isCustomToken: false,
  duration: 5,
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  startUtc: '',
  endUtc: '',
};

const NewWithdraw: React.FC = () => {
  const {t} = useTranslation();
  const formMethods = useForm<WithdrawFormData>({
    defaultValues,
    mode: 'onChange',
  });
  const {data: tokens} = useDaoTokens('myDaoAddress');
  const {account}: useWalletProps = useWallet();

  useEffect(() => {
    if (account) {
      // TODO: Change from to proper address
      formMethods.setValue('from', constants.AddressZero);
      formMethods.setValue('type', TransferTypes.Withdraw);
    }
  }, [account, formMethods]);

  /*************************************************
   *             Callbacks and Handlers            *
   *************************************************/

  const handleTokenSelect = (token: BaseTokenInfo) => {
    formMethods.setValue('tokenSymbol', token.symbol);

    if (token.address === '') {
      formMethods.setValue('isCustomToken', true);
      formMethods.resetField('tokenName');
      formMethods.resetField('tokenImgUrl');
      formMethods.resetField('tokenAddress');
      formMethods.resetField('tokenBalance');
      formMethods.clearErrors('amount');
      return;
    }

    formMethods.setValue('isCustomToken', false);
    formMethods.setValue('tokenName', token.name);
    formMethods.setValue('tokenImgUrl', token.imgUrl);
    formMethods.setValue('tokenAddress', token.address);
    formMethods.setValue(
      'tokenBalance',
      formatUnits(token.count, token.decimals)
    );
  };

  /*************************************************
   *                    Render                     *
   *************************************************/
  return (
    <FormProvider {...formMethods}>
      <FullScreenStepper
        navbarLabel={t('allTransfer.newTransfer')}
        navbarBackUrl="/#/finance"
        wizardProcessName={t('newWithdraw.withdrawAssets')}
      >
        {/* FIXME: Each step needs to be able to disable the back
        button. Otherwise, if the user leaves step x in an invalid state and
        goes back to a step < x, they won't be able to move forward. */}
        <Step
          wizardTitle={t('newWithdraw.configureWithdraw.title')}
          wizardDescription={t('newWithdraw.configureWithdraw.subtitle')}
          isNextButtonDisabled={!formMethods.formState.isValid}
        >
          <ConfigureWithdrawForm />
        </Step>
        <Step
          wizardTitle={t('newWithdraw.setupVoting.title')}
          wizardDescription={t('newWithdraw.setupVoting.description')}
          nextButtonLabel={t('labels.submitDeposit')}
          isNextButtonDisabled={!formMethods.formState.isValid}
        >
          <SetupVotingForm />
        </Step>
        <Step
          wizardTitle={t('newWithdraw.defineProposal.heading')}
          wizardDescription={t('newWithdraw.defineProposal.description')}
        >
          <DefineProposal />
        </Step>
      </FullScreenStepper>
      <TokenMenu
        isWallet={false}
        onTokenSelect={handleTokenSelect}
        tokenBalances={tokens}
      />
    </FormProvider>
  );
};

export default withTransaction('NewWithdraw', 'component')(NewWithdraw);
