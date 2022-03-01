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
import TokenMenu from 'containers/tokenMenu';
import {useDaoTokens} from 'hooks/useDaoTokens';
import {useWallet} from 'context/augmentedWallet';
import {formatUnits} from 'utils/library';
import {useWalletProps} from 'containers/walletMenu';
import {TransferTypes} from 'utils/constants';
import {BaseTokenInfo} from 'utils/types';
import {fetchTokenPrice} from 'services/prices';

const NewProposal: React.FC = () => {
  const {t} = useTranslation();
  const formMethods = useForm({
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

    fetchTokenPrice(token.address).then(price => {
      formMethods.setValue('tokenPrice', price);
    });
  };

  /*************************************************
   *                    Render                     *
   *************************************************/
  return (
    <FormProvider {...formMethods}>
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
      <TokenMenu
        isWallet={false}
        onTokenSelect={handleTokenSelect}
        tokenBalances={tokens}
      />
      <AddActionMenu />
    </FormProvider>
  );
};

export default withTransaction('NewProposal', 'component')(NewProposal);
