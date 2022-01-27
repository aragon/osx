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
import {useTranslation} from 'react-i18next';
import {withTransaction} from '@elastic/apm-rum-react';
import {useForm, FormProvider} from 'react-hook-form';
import React, {useCallback, useEffect, useState} from 'react';

import TokenMenu from 'containers/tokenMenu';
import {useWallet} from 'context/augmentedWallet';
import DepositForm from 'containers/depositForm';
import {useStepper} from 'hooks/useStepper';
import {formatUnits} from 'utils/library';
import ReviewDeposit from 'containers/reviewDeposit';
import {fetchBalance, isETH} from 'utils/tokens';
import {NavigationBar} from 'containers/navbar';
import {TransferTypes} from 'utils/constants';
import {useWalletProps} from 'containers/walletMenu';
import {useWalletMenuContext} from 'context/walletMenu';
import {BaseTokenInfo, TokenBalance} from 'utils/types';
import {constants} from 'ethers';

const steps = {
  configure: 1,
  review: 2,
};

const TOTAL_STEPS = Object.keys(steps).length;

export type FormData = {
  amount: string;
  isCustomToken: boolean;
  reference?: string;
  type: TransferTypes;
  from: Address;
  to: Address;
  tokenBalance: string;
  tokenSymbol: string;
  tokenAddress: Address;
  tokenName: string;
  tokenImgUrl: string;
};

const defaultValues = {
  amount: '',
  reference: '',
  tokenName: '',
  tokenImgUrl: '',
  tokenAddress: '',
  tokenSymbol: '',
  isCustomToken: false,
};

const NewDeposit: React.FC = () => {
  const {
    account,
    chainId,
    connect,
    ensAvatarUrl,
    ensName,
    isConnected,
    provider,
    getTokenList,
    balance,
  }: useWalletProps = useWallet();

  const {t} = useTranslation();
  const {open} = useWalletMenuContext();
  const formMethods = useForm<FormData>({defaultValues, mode: 'onChange'});
  const {currentStep, prev, next} = useStepper(TOTAL_STEPS);
  const [walletTokens, setWalletTokens] = useState<TokenBalance[]>([]);

  /*************************************************
   *                    Hooks                      *
   *************************************************/
  useEffect(() => {
    // add form metadata
    if (account) {
      formMethods.setValue('from', account);
      formMethods.setValue('type', TransferTypes.Deposit);
    }
  }, [account, formMethods]);

  // fetch tokens and corresponding balance on wallet
  useEffect(() => {
    async function fetchWalletTokens() {
      if (account === null) {
        setWalletTokens([]);
        return;
      }

      const tokenList = await getTokenList();
      if (Number(balance) !== -1 && Number(balance) !== 0)
        await tokenList.push(constants.AddressZero);

      // get tokens balance from wallet
      const balances = await Promise.all(
        tokenList.map(address => {
          if (isETH(address)) return formatUnits(balance, 18)?.slice(0, 4);
          else return fetchBalance(address, account, provider, false);
        })
      );

      // map tokens with their balance
      setWalletTokens(
        tokenList.map((token, index) => ({
          address: token,
          count: balances[index],
        }))
      );
    }

    fetchWalletTokens();
  }, [account, balance, chainId, getTokenList, provider]);

  /*************************************************
   *             Callbacks and Handlers            *
   *************************************************/
  const handleWalletButtonClick = useCallback(() => {
    isConnected() ? open() : connect('injected');
  }, [connect, isConnected, open]);

  const handleTokenSelect = (token: BaseTokenInfo) => {
    formMethods.setValue('tokenSymbol', token.symbol);

    // custom token selected, should reset all fields
    // save the symbol and clear any error pertaining to the amount
    if (token.address === '') {
      formMethods.setValue('isCustomToken', true);
      formMethods.resetField('tokenName');
      formMethods.resetField('tokenImgUrl');
      formMethods.resetField('tokenAddress');
      formMethods.resetField('tokenBalance');
      formMethods.clearErrors('amount');
      return;
    }

    // fill form with curated token values
    formMethods.setValue('isCustomToken', false);
    formMethods.setValue('tokenName', token.name);
    formMethods.setValue('tokenImgUrl', token.imgUrl);
    formMethods.setValue('tokenAddress', token.address);
    formMethods.setValue(
      'tokenBalance',
      formatUnits(token.count, token.decimals)
    );

    if (formMethods.formState.dirtyFields.amount) {
      formMethods.trigger('tokenAddress');
    }
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
          title={t('newDeposit.configureDeposit')}
          processName={t('newDeposit.depositAssets')}
          description={t('newDeposit.configureDepositSubtitle')}
          totalSteps={TOTAL_STEPS}
          currentStep={currentStep}
        />
        <FormProvider {...formMethods}>
          <FormLayout>
            {currentStep === steps.configure ? (
              <DepositForm />
            ) : (
              <ReviewDeposit />
            )}
            <FormFooter>
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
                  currentStep === 1
                    ? t('labels.continue')
                    : t('labels.submitDeposit')
                }
                size="large"
                onClick={next}
                disabled={!formMethods.formState.isValid}
                iconRight={<IconChevronRight />}
              />
            </FormFooter>
          </FormLayout>
        </FormProvider>
        <TokenMenu
          onTokenSelect={handleTokenSelect}
          tokenBalances={walletTokens}
        />
      </Layout>
    </>
  );
};

export default withTransaction('NewDeposit', 'component')(NewDeposit);

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
