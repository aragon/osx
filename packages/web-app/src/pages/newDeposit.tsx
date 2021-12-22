import React from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {withTransaction} from '@elastic/apm-rum-react';
import {
  ButtonWallet,
  IconChevronLeft,
  IconChevronRight,
  IconMenuVertical,
  Label,
  Wizard,
  ButtonText,
  ButtonIcon,
} from '@aragon/ui-components';
import {useWalletProps} from 'containers/walletMenu';
import {useWallet} from 'context/augmentedWallet';
import {NavigationBar} from 'containers/navbar';

const NewDeposit: React.FC = () => {
  const {t} = useTranslation();
  const {connect, isConnected, account, ensName, ensAvatarUrl}: useWalletProps =
    useWallet();

  const handleWalletButtonClick = () => {
    console.log('trigger');
    isConnected() ? open() : connect('injected');
  };

  return (
    <>
      <NavigationBar>
        <HStack>
          <InsetButton>
            <InsetIconContainer>
              <IconChevronLeft />
            </InsetIconContainer>
            <InsetButtonText>{t('allTransfer.newTransfer')}</InsetButtonText>
          </InsetButton>

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
          processName={t('newDeposit.depositAssets')}
          currentStep={1}
          totalSteps={2}
          title={t('newDeposit.configureDeposit')}
          description={t('newDeposit.configureDepositSubtitle')}
        />

        <FormLayout>
          <FormItem>
            <Label
              label={t('labels.to')}
              helpText={t('newDeposit.toSubtitle')}
            ></Label>
            <ButtonWallet label="patito.dao.eth" src={null} />
          </FormItem>

          <FormItem>
            <Label
              label={t('labels.token')}
              helpText={t('newDeposit.tokenSubtitle')}
            />
          </FormItem>

          <FormItem>
            <Label
              label={t('labels.amount')}
              helpText={t('newDeposit.amountSubtitle')}
            />
          </FormItem>

          <FormItem>
            <Label
              label={t('labels.reference')}
              helpText={t('newDeposit.referenceSubtitle')}
              isOptional={true}
            />
          </FormItem>

          <div className="flex justify-between mt-8">
            {/* Should change this to secondary on gray which is unsupported now */}
            <ButtonText
              label="Back"
              iconLeft={<IconChevronLeft />}
              mode="secondary"
              size="large"
              disabled
            />
            <ButtonText
              label="Continue"
              iconRight={<IconChevronRight />}
              mode="secondary"
              size="large"
            />
          </div>
        </FormLayout>
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

const FormItem = styled.div.attrs({
  className: 'space-y-1.5',
})``;

const HStack = styled.div.attrs({
  className: 'flex space-x-1.5',
})``;

const InsetButton = styled.div.attrs({
  className: 'flex items-center p-0.5 rounded-xl bg-ui-0',
})``;

const InsetIconContainer = styled.div.attrs({
  className: 'p-1.5 rounded-lg bg-ui-50',
})``;

const InsetButtonText = styled.div.attrs({
  className: 'pr-2 pl-1.5 font-bold text-ui-700',
})``;
