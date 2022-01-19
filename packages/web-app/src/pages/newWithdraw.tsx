import {
  ButtonIcon,
  ButtonText,
  ButtonWallet,
  IconChevronLeft,
  IconChevronRight,
  IconMenuVertical,
  Wizard,
} from '@aragon/ui-components';
import styled from 'styled-components';
import {Address} from '@aragon/ui-components/dist/utils/addresses';
import {constants} from 'ethers';
import {useTranslation} from 'react-i18next';
import {withTransaction} from '@elastic/apm-rum-react';
import React, {useCallback, useEffect} from 'react';
import {useForm, FormProvider, useFormState} from 'react-hook-form';

import TokenMenu from 'containers/tokenMenu';
import {useWallet} from 'context/augmentedWallet';
import {useStepper} from 'hooks/useStepper';
import {formatUnits} from 'utils/library';
import {useDaoTokens} from 'hooks/useDaoTokens';
import {NavigationBar} from 'containers/navbar';
import {BaseTokenInfo} from 'utils/types';
import {TransferTypes} from 'utils/constants';
import {useWalletProps} from 'containers/walletMenu';
import ConfigureWithdrawForm from 'containers/configureWithdraw';
import {useWalletMenuContext} from 'context/walletMenu';

export type FormData = {
  amount: string;
  reference?: string;
  type: TransferTypes;
  from: Address;
  to: Address;
  tokenName: string;
  tokenSymbol: string;
  tokenImgUrl: string;
  tokenDecimals: number;
  tokenAddress: Address;
  tokenBalance: string;
};

const steps = {
  configure: 1,
  setupVoting: 2,
  defineProposal: 3,
  reviewProposal: 4,
};

const TOTAL_STEPS = Object.keys(steps).length;

const defaultValues = {
  amount: '',
  reference: '',
  tokenAddress: '',
  tokenSymbol: '',
  tokenName: '',
  tokenImgUrl: '',
};

const NewWithdraw: React.FC = () => {
  const {t} = useTranslation();
  const {open} = useWalletMenuContext();
  const formMethods = useForm<FormData>({defaultValues, mode: 'onChange'});
  const {isValid} = useFormState({control: formMethods.control});
  const {data: tokens} = useDaoTokens('myDaoAddress');
  const {currentStep, prev, next} = useStepper(TOTAL_STEPS);
  const {connect, isConnected, account, ensName, ensAvatarUrl}: useWalletProps =
    useWallet();

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
  const handleWalletButtonClick = useCallback(() => {
    isConnected() ? open() : connect('injected');
  }, [connect, isConnected, open]);

  const handleTokenSelect = (token: BaseTokenInfo) => {
    formMethods.setValue('tokenName', token.name);
    formMethods.setValue('tokenImgUrl', token.imgUrl);
    formMethods.setValue('tokenSymbol', token.symbol);
    formMethods.setValue('tokenAddress', token.address);
    formMethods.setValue('tokenDecimals', token.decimals);
    formMethods.setValue(
      'tokenBalance',
      formatUnits(token.count, token.decimals)
    );
  };

  /*************************************************
   *                    Render                     *
   *************************************************/
  return (
    <>
      <NavigationBar>
        <HStack>
          <InsetButton>
            <InsetIconContainer href={'/#/finance'}>
              <IconChevronLeft />
            </InsetIconContainer>
            <InsetButtonText>{t('allTransfer.newTransfer')}</InsetButtonText>
          </InsetButton>

          {/* TODO: Add action after knowing the purpose of this button */}
          <ButtonIcon
            mode="secondary"
            size="large"
            icon={<IconMenuVertical />}
          />
        </HStack>

        <ButtonWallet
          onClick={handleWalletButtonClick}
          isConnected={isConnected()}
          label={
            isConnected() ? ensName || account : t('navButtons.connectWallet')
          }
          src={ensAvatarUrl || account}
        />
      </NavigationBar>

      <Layout>
        <Wizard
          processName={t('newWithdraw.withdrawAssets')}
          title={t('newWithdraw.configureWithdraw.title')}
          description={t('newWithdraw.configureWithdraw.subtitle')}
          totalSteps={TOTAL_STEPS}
          currentStep={currentStep}
        />
        <FormProvider {...formMethods}>
          <FormLayout>
            {currentStep === steps.configure ? (
              <ConfigureWithdrawForm />
            ) : (
              <h1>Review Withdraw</h1>
            )}
            <FormFooter>
              {/* Should change this to secondary on gray which is unsupported now */}
              <ButtonText
                mode="secondary"
                size="large"
                label={t('labels.back')}
                onClick={prev}
                disabled={currentStep === 1}
                iconLeft={<IconChevronLeft />}
              />
              <ButtonText
                label={
                  currentStep === steps.reviewProposal
                    ? t('labels.submitWithdraw')
                    : t('labels.continue')
                }
                size="large"
                onClick={next}
                disabled={!isValid}
                iconRight={<IconChevronRight />}
              />
            </FormFooter>
          </FormLayout>
        </FormProvider>
        <TokenMenu
          isWallet={false}
          tokenBalances={tokens}
          onTokenSelect={handleTokenSelect}
        />
      </Layout>
    </>
  );
};

export default withTransaction('NewWithdraw', 'component')(NewWithdraw);

const Layout = styled.div.attrs({
  className: 'm-auto mt-3 w-8/12 font-medium text-ui-600',
})``;

const FormLayout = styled.div.attrs({
  className: 'my-8 mx-auto space-y-5 w-3/4',
})``;

const HStack = styled.div.attrs({
  className: 'flex space-x-1.5',
})``;

const InsetButton = styled.div.attrs({
  className: 'flex items-center p-0.5 rounded-xl bg-ui-0',
})``;

const InsetIconContainer = styled.a.attrs({
  className: 'p-1.5 rounded-lg bg-ui-50',
})``;

const InsetButtonText = styled.div.attrs({
  className: 'pr-2 pl-1.5 font-bold text-ui-700',
})``;

const FormFooter = styled.div.attrs({
  className: 'flex justify-between mt-8',
})``;
