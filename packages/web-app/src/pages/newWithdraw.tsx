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

export type TransferData = {
  amount: string;
  from: Address;
  to: Address;
  reference?: string;
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
  amount: '',
  reference: '',
  tokenAddress: '',
  tokenSymbol: '',
  tokenName: '',
  tokenImgUrl: '',
  isCustomToken: false,
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
        <Step
          wizardTitle={t('newWithdraw.configureWithdraw.title')}
          wizardDescription={t('newWithdraw.configureWithdraw.subtitle')}
          isNextButtonDisabled={!formMethods.formState.isValid}
        >
          <ConfigureWithdrawForm />
        </Step>
        <Step
          wizardTitle={t('newDeposit.reviewTransfer')}
          wizardDescription={t('newDeposit.reviewTransferSubtitle')}
          nextButtonLabel={t('labels.submitDeposit')}
        >
          <div>Voting setup form comes here.</div>
          {/* TODO create form for second withdrawl step (analoguosly to
            ConfigureWithdrawlForm above) is created. (DAO-621) */}
          {/* <SetupVotingForm /> */}
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
